import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DiningScenario} from '../support/DiningScenario';
import {DiningSessionWorkflow} from '../../src/coordination/application/workflow/DiningSessionWorkflow';
import {StorageDiningPreferences} from '../../src/infrastructure/storage/StorageDiningPreferences';
import {ManagedRoomConnection} from '../../src/infrastructure/event-store/ManagedRoomConnection';
import type {RoomConnection} from '../../src/coordination/application/port/out/RoomConnection';
import type {RoomSubscription} from '../../src/kernel/application/RoomSubscription';

export namespace DiningSessionWorkflowSpec {
    function device(meal = new DiningScenario.Meal(), referenceCatalog = [DiningScenario.restaurant()]) {
        const calls: string[] = [];
        const preferences = new StorageDiningPreferences(meal.app.runtime);
        const connection: RoomConnection = {
            watch: async roomId => { calls.push(`watch:${roomId}`); await meal.app.runtime.synchronize(roomId); },
            stop: () => { calls.push('stop'); },
            acknowledge: async roomId => { calls.push(`acknowledge:${roomId}`); }
        };
        const gateway = {
            create: async () => { calls.push('allocate'); return {roomId: 'room', code: '123456'}; },
            locate: async (code: string) => { assert.equal(code, '123456'); calls.push('locate'); return {roomId: 'room'}; }
        };
        const sessions = new DiningSessionWorkflow(meal.dining, preferences, gateway, connection, referenceCatalog);
        return {meal, sessions, preferences, connection, calls};
    }

    export function verify(): void {
        test('初始化默认目录仅填充空设备，已删除的原件不会被重新发布', async () => {
            const d = device();
            await d.sessions.initialize();
            const identity = d.meal.dining.identity().id;
            await d.meal.dining.deleteRestaurant('buffet');
            await d.sessions.initialize();
            assert.equal(d.meal.dining.identity().id, identity);
            assert.deepEqual(d.meal.dining.localRestaurants(), []);
            assert.equal(d.meal.dining.localRestaurant('buffet').deleted, true);
            assert.equal(d.meal.dining.localRestaurant('buffet').version, 2);
        });

        test('创建房间在远端分配前校验票价，并按顺序同步及提交完整房间', async () => {
            const d = device();
            await d.sessions.initialize();
            for (const amount of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
                await assert.rejects(d.sessions.createRoom(amount, 'My'), /INVALID_TICKET_PRICE/);
            assert.deepEqual(d.calls, []);
            await d.sessions.createRoom(20000, 'My');
            assert.deepEqual(d.calls, ['allocate', 'watch:room']);
            assert.equal(d.preferences.lastRoom(), 'room');
            assert.equal(d.meal.dining.room()!.hostId, d.meal.dining.identity().id);
            assert.equal(d.meal.dining.activity()!.ticketPriceMinor, 20000);
            assert.equal(d.meal.dining.restaurants().length, 1);
            assert.equal(d.meal.relay.streams.get('room')!.length, 1);
        });

        test('加入先补齐房间事件；已在线成员及上次房间直接恢复会话，不重复加入', async () => {
            const owner = device();
            await owner.sessions.initialize();
            await owner.sessions.createRoom(20000, 'My');
            const guest = device(new DiningScenario.Meal(owner.meal.relay, 'guest'), []);
            await guest.sessions.initialize();
            await guest.sessions.joinRoom('123456');
            assert.equal(guest.meal.dining.room()!.members.length, 2);
            assert.equal(guest.preferences.lastRoom(), 'room');
            const sent = owner.meal.relay.sent;
            await guest.sessions.joinRoom();
            assert.equal(owner.meal.relay.sent, sent);
            assert.deepEqual(guest.calls, ['locate', 'watch:room', 'watch:room']);
            await guest.sessions.refresh();
            await guest.sessions.acknowledgeSubmission();
            await guest.sessions.leaveRoom();
            assert.equal(guest.meal.dining.session(), undefined);
            assert.deepEqual(guest.calls.slice(-3), ['watch:room', 'acknowledge:room', 'stop']);
        });

        test('没有上次房间时拒绝恢复，不启动同步连接', async () => {
            const d = device();
            await assert.rejects(d.sessions.joinRoom(), /没有上次房间/);
            assert.deepEqual(d.calls, []);
        });

        test('创建业务失败释放连接，并保留已分配的房间以供核对', async () => {
            const d = device();
            await d.sessions.initialize();
            await d.meal.dining.createRoom('other', '654321', 20000);
            await assert.rejects(d.sessions.createRoom(20000, 'My'), /ACTIVE_ROOM_EXISTS/);
            assert.deepEqual(d.calls, ['allocate', 'watch:room', 'stop']);
            assert.equal(d.preferences.lastRoom(), 'room');
            assert.equal(d.meal.dining.session()!.roomId, 'other');
            assert.equal(d.meal.relay.streams.has('room'), false);
        });

        test('加入已废弃房间仍由领域拒绝，应用流程释放连接', async () => {
            const owner = device();
            await owner.sessions.initialize();
            await owner.sessions.createRoom(20000, 'My');
            await owner.meal.dining.abandon();
            const guest = device(new DiningScenario.Meal(owner.meal.relay, 'guest'), []);
            await guest.sessions.initialize();
            await assert.rejects(guest.sessions.joinRoom('123456'), /ROOM_ABANDONED/);
            assert.equal(guest.calls.at(-1), 'stop');
            assert.equal(guest.meal.dining.session(), undefined);
        });

        test('创建提交响应丢失时保留恢复连接，补齐历史不会自动重发写命令', async () => {
            const d = device();
            await d.sessions.initialize();
            d.meal.relay.loseResponse = true;
            await assert.rejects(d.sessions.createRoom(20000, 'My'), /UNKNOWN_COMMIT_OUTCOME/);
            assert.deepEqual(d.calls, ['allocate', 'watch:room']);
            assert.equal(d.preferences.lastRoom(), 'room');
            assert.equal(d.meal.relay.sent, 1);
            await d.meal.app.runtime.synchronize('room');
            assert.ok(d.meal.dining.findRoom('room'));
            assert.equal(d.meal.relay.sent, 1);
        });

        test('首次同步失败清理订阅，重试同一房间会重新连接', async t => {
            let subscriptions = 0, closed = 0, syncs = 0;
            const connection = new ManagedRoomConnection({
                subscribe: async () => { subscriptions++; return () => { closed++; }; }
            }, {
                synchronize: async () => { if (++syncs === 1) throw new Error('OFFLINE'); },
                rebuild: async () => {}, acknowledgeUnknown: async () => {}
            }, {projectCommitted: async () => {}}, () => {});
            t.after(() => connection.stop());
            await assert.rejects(connection.watch('room'), /OFFLINE/);
            assert.equal(closed, 1);
            await connection.watch('room');
            await connection.watch('room');
            assert.equal(subscriptions, 2);
            assert.equal(syncs, 2);
        });

        test('同房间的并发监听等待首次同步完成，停止后关闭延迟建立的连接', async () => {
            let open!: (stop: () => void) => void, closed = 0;
            const connection = new ManagedRoomConnection({
                subscribe: () => new Promise(resolve => { open = resolve; })
            }, {
                synchronize: async () => {}, rebuild: async () => {}, acknowledgeUnknown: async () => {}
            }, {projectCommitted: async () => {}}, () => {});
            const pending = connection.watch('room');
            assert.equal(connection.watch('room'), pending);
            connection.stop();
            open(() => { closed++; });
            await assert.rejects(pending, /ROOM_CONNECTION_CANCELLED/);
            assert.equal(closed, 1);
        });

        test('事件缺口触发历史补齐；停止后忽略旧连接通知', async t => {
            let receive!: Parameters<RoomSubscription['subscribe']>[1], syncs = 0, projections = 0;
            const connection = new ManagedRoomConnection({
                subscribe: async (_room, onBatch) => { receive = onBatch; return () => {}; }
            }, {
                synchronize: async () => { syncs++; }, rebuild: async () => {}, acknowledgeUnknown: async () => {}
            }, {projectCommitted: async () => { projections++; throw new Error('EVENT_GAP'); }}, error => { assert.fail(String(error)); });
            t.after(() => connection.stop());
            await connection.watch('room');
            const meal = new DiningScenario.Meal();
            await meal.givenRoom();
            receive(meal.relay.streams.get('room')![0]);
            await new Promise(resolve => setImmediate(resolve));
            assert.equal(syncs, 2);
            connection.stop();
            receive();
            assert.equal(syncs, 2);
            assert.equal(projections, 1);
        });
    }
}
