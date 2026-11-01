import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {PrismaClient} from '../../server/generated/client'
import {RoomEventStore} from '../../server/src/event-store/RoomEventStore'
import {RelayServer} from '../../server/src/transport/RelayServer'
import {loadModule} from '../helpers/runtime.cjs'

export namespace RelaySpec {
    export async function database() {
        const directory = mkdtempSync(join(tmpdir(), 'buffet-relay-'))
        const db = new PrismaClient({datasources: {db: {url: `file:${join(directory, 'events.db').replace(/\\/g, '/')}`}}})
        await db.$executeRawUnsafe('CREATE TABLE RoomStream (roomId TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, version INTEGER NOT NULL DEFAULT 0, catalogDocument TEXT)')
        await db.$executeRawUnsafe('CREATE TABLE RoomBatch (batchId TEXT PRIMARY KEY, roomId TEXT NOT NULL REFERENCES RoomStream(roomId), previousVersion INTEGER NOT NULL, fromVersion INTEGER NOT NULL, toVersion INTEGER NOT NULL, document TEXT NOT NULL, UNIQUE(roomId,fromVersion))')
        await db.$executeRawUnsafe('CREATE TABLE RoomEvent (roomId TEXT NOT NULL, version INTEGER NOT NULL, batchId TEXT NOT NULL REFERENCES RoomBatch(batchId), batchIndex INTEGER NOT NULL, document TEXT NOT NULL, PRIMARY KEY(roomId,version), UNIQUE(batchId,batchIndex))')
        return {
            db, dispose: async () => {
                await db.$disconnect();
                rmSync(directory, {recursive: true, force: true})
            }
        }
    }

    export const opaque = (type = 'UnknownBusinessFact') => ({
        type,
        schemaVersion: 999,
        key: 'opaque/key',
        payload: {host: 'untrusted', quantity: -3}
    })

    export function verify(): void {
        test('UniApp 创建房间传入空 JSON 对象，兼容默认 application/json 请求头',async()=>{
            const fixture=await database(),app=await RelayServer.create(fixture.db)
            try{
                const {UniRoomRelay}=loadModule('infrastructure/event-store/UniRoomRelay',{
                    request:async(options:{url:string;method:'GET'|'POST';data:unknown;success:(response:{statusCode:number;data:unknown})=>void})=>{
                        const response=await app.inject({method:options.method,url:new URL(options.url).pathname,headers:{'content-type':'application/json'},payload:options.data as object})
                        options.success({statusCode:response.statusCode,data:response.json()})
                    }
                })
                const room=await new UniRoomRelay.Client('http://local.test').create()
                assert.match(room.code,/^\d{6}$/)
                assert.equal(await fixture.db.roomStream.count(),1)
            }finally{await app.close();await fixture.dispose()}
        })
        test('SQLite 原子 CAS：两个相同版本竞争只有一个成功；各房间独立；重启可读完整批次', async () => {
            const fixture = await database()
            try {
                const store = new RoomEventStore.Store(fixture.db), room = await store.create(),
                    other = await store.create()
                const results = await Promise.allSettled([store.append(room.roomId, 0, [opaque(), opaque()]), store.append(room.roomId, 0, [opaque()])])
                assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
                assert.ok((results.find(r => r.status === 'rejected') as PromiseRejectedResult).reason instanceof RoomEventStore.Conflict)
                const committed = (results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>).value
                assert.equal(await store.head(room.roomId), committed.toVersion)
                assert.equal(await store.head(other.roomId), 0)
                await fixture.db.$disconnect()
                assert.equal((await store.read(room.roomId)).batches[0].events.length, committed.events.length)
            } finally {
                await fixture.dispose()
            }
        })
        test('SQLite 第三个事件 SQL 失败回滚前两条、批次和 head', async () => {
            const fixture = await database()
            try {
                const store = new RoomEventStore.Store(fixture.db), room = await store.create()
                await fixture.db.$executeRawUnsafe("CREATE TRIGGER reject_third BEFORE INSERT ON RoomEvent WHEN NEW.batchIndex = 2 BEGIN SELECT RAISE(ABORT, 'FAULT_INJECTED'); END")
                await assert.rejects(store.append(room.roomId, 0, [opaque(), opaque(), opaque()]))
                assert.equal(await store.head(room.roomId), 0)
                assert.equal(await fixture.db.roomBatch.count(), 0);
                assert.equal(await fixture.db.roomEvent.count(), 0)
            } finally {
                await fixture.dispose()
            }
        })
        test('HTTP/WS 信封检查、409、整批分页；断开订阅不影响纯中继日志', async () => {
            const fixture = await database(), app = await RelayServer.create(fixture.db)
            try {
                const room = (await app.inject({method: 'POST', url: '/rooms'})).json()
                const notices: { type: string; latestVersion?: number; batch?: import('../../protocol/EventBatch').EventBatch.Committed }[] = []
                const socket = await app.injectWS(`/rooms/${room.roomId}/subscribe`, {}, {
                    onInit: ws => {
                        ws.on('message', (data: unknown) => {
                            notices.push(JSON.parse(String(data)))
                        })
                    }
                })
                assert.equal((await app.inject({url: `/room-codes/${room.code}`})).json().roomId, room.roomId)
                const url = `/rooms/${room.roomId}/events`
                assert.equal((await app.inject({
                    method: 'POST',
                    url,
                    payload: {expectedVersion: 0, events: []}
                })).statusCode, 400)
                const first = await app.inject({
                    method: 'POST',
                    url,
                    payload: {expectedVersion: 0, events: [opaque(), opaque()]}
                })
                assert.equal(first.statusCode, 200)
                await new Promise<void>(resolve => setImmediate(resolve))
                assert.equal(notices[0].type, 'subscribed')
                assert.ok(notices.some(notice => notice.latestVersion === 2));
                assert.deepEqual(notices.find(notice => notice.batch)!.batch!.events.map(e => e.streamVersion), [1, 2])
                socket.terminate()
                const conflict = await app.inject({method: 'POST', url, payload: {expectedVersion: 0, events: [opaque()]}})
                assert.equal(conflict.statusCode, 409)
                assert.equal(conflict.json().batches.length, 1)
                assert.equal(conflict.json().batches[0].toVersion, 2)
                assert.equal(conflict.json().latestVersion, 2)
                assert.equal((await app.inject({method: 'POST', url, payload: {expectedVersion: 2, events: [{...opaque(), streamVersion: 99}]}})).statusCode, 400)
                assert.equal((await app.inject({
                    method: 'POST',
                    url,
                    payload: {expectedVersion: 2, events: [opaque()]}
                })).statusCode, 200)
                const page = (await app.inject({url: url + '?afterVersion=0&limitBatches=1'})).json()
                assert.equal(page.batches.length, 1);
                assert.equal(page.batches[0].events.length, 2);
                assert.equal(page.hasMore, true)
                assert.equal((await app.inject({url: url + '?afterVersion=1'})).statusCode, 400)
                assert.equal((await app.inject({url: '/rooms/missing/head'})).statusCode, 404)
            } finally {
                await app.close();
                await fixture.dispose()
            }
        })
    }
}
