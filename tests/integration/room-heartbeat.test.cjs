require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {loadModule} = require('../helpers/runtime.cjs')
const {RoomHeartbeat} = require('../../protocol/RoomHeartbeat.ts')
const {ManagedRoomConnection} = require('../../src/infrastructure/event-store/ManagedRoomConnection.ts')
const flush = () => new Promise(resolve => setImmediate(resolve))

function client(t, sendFailure = false) {
    t.mock.timers.enable({apis: ['setTimeout']})
    const sent = [], failures = [], hints = [], handlers = {}
    let closed = 0, url
    const {UniRoomRelay} = loadModule('infrastructure/event-store/UniRoomRelay', {
        request: options => options.success({statusCode: 200, data: {version: 0}}),
        connectSocket: options => {
            url = options.url
            return {
                onMessage: handler => {
                    handlers.message = handler
                    queueMicrotask(() => handler({data: JSON.stringify({type: 'subscribed', roomId: 'room',
                        catalog: {restaurants: [], images: []}, heartbeat: RoomHeartbeat.defaults})}))
                },
                onError: handler => { handlers.error = handler }, onClose: handler => { handlers.close = handler },
                send: options => { sent.push(JSON.parse(options.data)); if (sendFailure) options.fail() },
                close: () => { closed++; handlers.close?.() }
            }
        }
    })
    const relay = new UniRoomRelay.Client('http://relay')
    return {sent, failures, hints, handlers, closed: () => closed, url: () => url,
        subscribe: () => relay.subscribe('room', batch => hints.push(batch), error => failures.push(error.message)),
        receive: notice => handlers.message({data: JSON.stringify(notice)})}
}

test('客户端确认心跳并重置超时，心跳不触发领域回放或查询失效；主动退出清除检测', async t => {
    const app = client(t), stop = await app.subscribe()
    assert.ok(app.url().endsWith('/subscribe'))
    app.receive({type: 'heartbeat', roomId: 'room', sequence: 1})
    assert.deepEqual(app.sent, [{type: 'heartbeatAck', roomId: 'room', sequence: 1}])
    t.mock.timers.tick(RoomHeartbeat.defaults.timeoutMs - 1)
    app.receive({type: 'heartbeat', roomId: 'room', sequence: 2})
    t.mock.timers.tick(RoomHeartbeat.defaults.timeoutMs - 1)
    assert.deepEqual(app.failures, [])
    assert.deepEqual(app.hints, [])
    stop()
    app.receive({type: 'heartbeat', roomId: 'room', sequence: 3})
    t.mock.timers.tick(60000)
    assert.equal(app.sent.length, 2)
    assert.equal(app.closed(), 1)
    assert.deepEqual(app.failures, [])
})

test('客户端未收到心跳或确认发送失败时，关闭连接且错误只报告一次', async t => {
    for (const sendFailure of [false, true]) {
        await t.test(String(sendFailure), async child => {
            const app = client(child, sendFailure)
            await app.subscribe()
            app.receive({type: 'heartbeat', roomId: 'other-room', sequence: 1})
            if (sendFailure) app.receive({type: 'heartbeat', roomId: 'room', sequence: 1})
            else child.mock.timers.tick(RoomHeartbeat.defaults.timeoutMs)
            app.handlers.error()
            app.handlers.close()
            child.mock.timers.tick(60000)
            assert.deepEqual(app.failures, [sendFailure ? 'DISCONNECTED' : 'HEARTBEAT_TIMEOUT'])
            assert.equal(app.closed(), 1)
        })
    }
})

test('心跳超时自动重连并补齐历史，旧连接迟到事件忽略，连续失败逐步延长重试', async t => {
    t.mock.timers.enable({apis: ['setTimeout', 'setInterval']})
    const callbacks = [], failures = [], received = []
    let closes = 0, syncs = 0, attempts = 0
    const connection = new ManagedRoomConnection({subscribe: async (_id, batch, error) => {
        attempts++
        if (attempts === 2) throw new Error('DISCONNECTED')
        callbacks.push({batch, error})
        return () => { closes++ }
    }}, {synchronize: async () => { syncs++ }}, {projectCommitted: async batch => { received.push(batch) }},
    error => failures.push(error.message))
    t.after(() => connection.stop())
    await connection.watch('room')
    callbacks[0].error(new Error('HEARTBEAT_TIMEOUT'))
    let restored = false
    const recovering = connection.watch('room').then(() => { restored = true })
    t.mock.timers.tick(1000)
    await flush()
    assert.equal(attempts, 2)
    assert.equal(restored, false)
    t.mock.timers.tick(1999)
    assert.equal(attempts, 2)
    t.mock.timers.tick(1)
    await recovering
    assert.equal(syncs, 2)
    assert.equal(closes, 1)
    callbacks[0].batch({batchId: 'stale'})
    callbacks[1].batch({batchId: 'current'})
    await flush()
    assert.deepEqual(received, [{batchId: 'current'}])
    assert.deepEqual(failures, ['HEARTBEAT_TIMEOUT'])
})

test('退出或切后台会取消心跳重连，不会重新进入已退出房间', async t => {
    for (const method of ['stop', 'suspend']) {
        await t.test(method, async child => {
            child.mock.timers.enable({apis: ['setTimeout', 'setInterval']})
            let error, subscriptions = 0
            const connection = new ManagedRoomConnection({subscribe: async (_id, _batch, failed) => {
                error = failed; subscriptions++; return () => {}
            }}, {synchronize: async () => {}}, {}, () => {})
            await connection.watch('room')
            error(new Error('HEARTBEAT_TIMEOUT'))
            const pending = connection.watch('room')
            connection[method]()
            await assert.rejects(pending, /ROOM_CONNECTION_CANCELLED/)
            child.mock.timers.tick(60000)
            assert.equal(subscriptions, 1)
        })
    }
})

test('服务端心跳确认维持连接，错误确认超时断开，不修改事件流；最后一人离线才计时回收', {timeout: 5000}, async t => {
    const {RelaySpec} = require('../event-store/RelaySpec.ts')
    const {RelayServer} = require('../../server/src/transport/RelayServer.ts')
    const database = await RelaySpec.database(), app = await RelayServer.create(database.db, {heartbeat: {intervalMs: 20, timeoutMs: 100}})
    let live, stale
    t.after(async () => { live?.terminate(); stale?.terminate(); await app.close(); await database.dispose() })
    const room = (await app.inject({method: 'POST', url: '/rooms'})).json()
    const received = []
    live = await app.injectWS(`/rooms/${room.roomId}/subscribe?heartbeat=1`, {}, {onInit: ws => {
        ws.on('message', data => {
            const notice = JSON.parse(String(data))
            received.push(notice)
            if (notice.type === 'heartbeat') ws.send(JSON.stringify({type: 'heartbeatAck', roomId: room.roomId, sequence: notice.sequence}))
        })
    }})
    let closed
    const disconnected = new Promise(resolve => { closed = resolve })
    stale = await app.injectWS(`/rooms/${room.roomId}/subscribe?heartbeat=1`, {}, {onInit: ws => {
        ws.on('close', closed)
        ws.on('message', data => {
            const notice = JSON.parse(String(data))
            if (notice.type === 'heartbeat') {
                ws.send(JSON.stringify({type: 'heartbeatAck', roomId: 'wrong-room', sequence: notice.sequence}))
                ws.send(JSON.stringify({type: 'heartbeatAck', roomId: room.roomId, sequence: notice.sequence + 1}))
            }
        })
    }})
    await disconnected
    assert.ok(received.filter(notice => notice.type === 'heartbeat').length >= 2)
    assert.equal(live.readyState, 1)
    assert.equal((await database.db.roomStream.findUnique({where: {roomId: room.roomId}})).emptySince, null)
    assert.equal(await database.db.roomEvent.count(), 0)
    assert.equal(await database.db.roomBatch.count(), 0)
    live.terminate()
    await flush()
    await app.inject({url: `/rooms/${room.roomId}/head`})
    assert.ok((await database.db.roomStream.findUnique({where: {roomId: room.roomId}})).emptySince)
})
