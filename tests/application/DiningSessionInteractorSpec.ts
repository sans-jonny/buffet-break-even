import {InitializeDiningUseCase} from '../../src/coordination/application/port/in/initialization/InitializeDiningUseCase';
import {StartSingleDiningUseCase} from '../../src/coordination/application/port/in/session/StartSingleDiningUseCase';
import {ResumeSingleDiningUseCase} from '../../src/coordination/application/port/in/session/ResumeSingleDiningUseCase';
import {CreateDiningRoomUseCase} from '../../src/coordination/application/port/in/session/CreateDiningRoomUseCase';
import {JoinDiningRoomUseCase} from '../../src/coordination/application/port/in/session/JoinDiningRoomUseCase';
import {RefreshDiningSessionUseCase} from '../../src/coordination/application/port/in/session/RefreshDiningSessionUseCase';
import {LeaveDiningSessionUseCase} from '../../src/coordination/application/port/in/session/LeaveDiningSessionUseCase';
import {AcknowledgeDiningSubmissionUseCase} from '../../src/coordination/application/port/in/session/AcknowledgeDiningSubmissionUseCase';
import {CoordinationComposition} from '../../src/coordination/composition/CoordinationComposition';
import {RoomGateway} from '../../src/coordination/application/port/out/session/RoomGateway';
import {DiningPreferences} from '../../src/coordination/application/port/out/session/DiningPreferences';
import {CreateDiningRoomInteractor} from '../../src/coordination/application/use-case/session/CreateDiningRoomInteractor';
import {CreateMultiplayerDiningUseCase} from '../../src/coordination/application/port/in/dining/CreateMultiplayerDiningUseCase';
import {GetPersonalDiningUseCase} from '../../src/coordination/application/port/in/device/GetPersonalDiningUseCase';
import {ListRestaurantsUseCase} from '../../src/contexts/catalog/application/port/in/ListRestaurantsUseCase';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DiningScenario} from '../support/DiningScenario';
import {StorageDiningPreferences} from '../../src/infrastructure/storage/StorageDiningPreferences';
import {ManagedRoomConnection} from '../../src/infrastructure/event-store/ManagedRoomConnection';
import {RoomConnection} from '../../src/coordination/application/port/out/session/RoomConnection';
import type {RoomSubscription} from '../../src/kernel/application/RoomSubscription';

export namespace DiningSessionInteractorSpec {
    function device(meal = new DiningScenario.Meal(undefined, 'one', false), referenceCatalog = [DiningScenario.restaurant()]) {
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
        meal.app.provide(RoomConnection.token, connection);
        meal.app.provide(RoomGateway.token, gateway);
        meal.app.provide(DiningPreferences.token, preferences);
        CoordinationComposition.registerSessions(meal.app, meal.id);
        const sessions = {
            initialize: async () => meal.app.resolve(InitializeDiningUseCase.token).execute(new InitializeDiningUseCase.Request(referenceCatalog)),
            startSingle: async (total: number, categoryId: string, replaceActivityId?: string) => meal.app.resolve(StartSingleDiningUseCase.token).execute(new StartSingleDiningUseCase.Request(total, categoryId, replaceActivityId)),
            resumeSingle: async (session: import('../../src/coordination/application/dto/Dining').Dining.Session) => meal.app.resolve(ResumeSingleDiningUseCase.token).execute(new ResumeSingleDiningUseCase.Request(session)),
            createRoom: async (total: number, categoryId: string) => meal.app.resolve(CreateDiningRoomUseCase.token).execute(new CreateDiningRoomUseCase.Request(total, categoryId)),
            joinRoom: async (code?: string) => meal.app.resolve(JoinDiningRoomUseCase.token).execute(new JoinDiningRoomUseCase.Request(code)),
            refresh: async () => meal.app.resolve(RefreshDiningSessionUseCase.token).execute(new RefreshDiningSessionUseCase.Request()),
            leaveRoom: async () => meal.app.resolve(LeaveDiningSessionUseCase.token).execute(new LeaveDiningSessionUseCase.Request()),
            acknowledgeSubmission: async () => meal.app.resolve(AcknowledgeDiningSubmissionUseCase.token).execute(new AcknowledgeDiningSubmissionUseCase.Request())
        };
        return {meal, sessions, preferences, connection, gateway, calls};
    }

    export function verify(): void {
        test('没有当前房间时，刷新和核对提交不启动连接', async () => {
            const d = device();
            await d.sessions.initialize();
            await d.sessions.refresh();
            await d.sessions.acknowledgeSubmission();
            assert.deepEqual(d.calls, []);
        });

        test('远端创建成功后会话选择失败，保留房间并可恢复，不撤销或重发创建', async () => {
            const d = device();
            await d.sessions.initialize();
            const interactor = new CreateDiningRoomInteractor(d.meal.app.resolve(CreateMultiplayerDiningUseCase.token),
                {execute: async () => { throw new Error('SELECTION_FAILED'); }},
                d.meal.app.resolve(GetPersonalDiningUseCase.token), d.meal.app.resolve(ListRestaurantsUseCase.token),
                d.preferences, d.gateway, d.connection, d.meal.id);
            await assert.rejects(interactor.execute(new CreateDiningRoomUseCase.Request(20000, 'My')), /SESSION_SELECTION_PENDING/);
            assert.equal(d.meal.relay.sent, 1);
            assert.ok(d.meal.app.collaboration.findRoom('room'));
            assert.equal(d.meal.dining.session(), undefined);
            assert.equal(d.preferences.lastRoom(), 'room');
            assert.deepEqual(d.calls, ['allocate', 'watch:room', 'stop']);
            await d.sessions.joinRoom();
            assert.equal(d.meal.dining.session()!.roomId, 'room');
            assert.equal(d.meal.relay.sent, 1);
        });

        test('退出提交结果未知时仍清理本机会话和连接，保留歧义记录且不重复退出', async () => {
            const owner = device();
            await owner.sessions.initialize();
            await owner.sessions.createRoom(20000, 'My');
            const guest = device(new DiningScenario.Meal(owner.meal.relay, 'guest', false), []);
            await guest.sessions.initialize();
            await guest.sessions.joinRoom('123456');
            const session = guest.meal.dining.session(), sent = guest.meal.relay.sent;
            guest.meal.relay.loseResponse = true;
            await guest.sessions.leaveRoom();
            assert.equal(guest.meal.dining.session(), undefined);
            assert.equal(guest.calls.includes('stop'), true);
            assert.ok(guest.meal.app.runtime.get('outcome/room'));
            assert.equal(guest.meal.relay.sent, sent + 1);
            await guest.meal.app.runtime.synchronize('room');
            assert.equal(guest.meal.relay.sent, sent + 1);
        });

        test('单人创建与恢复由应用流程停止房间监听，失败时保留原连接', async () => {
            const d = device();
            await d.sessions.initialize();
            await d.sessions.startSingle(20000, 'My');
            const session = d.meal.dining.session()!;
            assert.deepEqual(d.calls, ['stop']);
            await d.meal.selectSession({scopeId: 'other', activityId: 'other', roomId: null});
            await d.sessions.resumeSingle(session);
            assert.equal(d.meal.dining.session()!.activityId, session.activityId);
            assert.deepEqual(d.calls, ['stop', 'stop']);
            await assert.rejects(d.sessions.startSingle(0, 'My'), /INVALID_TICKET_PRICE/);
            assert.deepEqual(d.calls, ['stop', 'stop']);
        });
        test('初始化默认目录不会重新发布已删除的原件', async () => {
            const d = device();
            await d.sessions.initialize();
            const identity = d.meal.dining.identity().id;
            await d.meal.app.catalog.remove('buffet');
            await d.sessions.initialize();
            assert.equal(d.meal.dining.identity().id, identity);
            assert.deepEqual(d.meal.app.catalog.restaurants, []);
            assert.equal(d.meal.app.catalog.restaurant('buffet', true).deleted, true);
            assert.equal(d.meal.app.catalog.restaurant('buffet', true).version, 2);
        });

        test('已有目录的设备补入新增餐厅分类，保留本地编辑且重复初始化不重复发布', async () => {
            const d = device();
            await d.sessions.initialize();
            await d.meal.app.catalog.publish(DiningScenario.restaurant({version: 2, name: '本地修改'}));
            const added = DiningScenario.restaurant({id: 'new-bbq', type: 'PUBLIC', restaurantCategory: {id: 'barbecue', name: '烤肉'}});
            const request = new InitializeDiningUseCase.Request([DiningScenario.restaurant(), added]);
            await d.meal.app.resolve(InitializeDiningUseCase.token).execute(request);
            assert.equal(d.meal.app.catalog.restaurant('buffet').name, '本地修改');
            assert.equal(d.meal.app.catalog.restaurant('buffet').version, 2);
            assert.equal(d.meal.app.catalog.restaurant('new-bbq').restaurantCategory.id, 'barbecue');
            await d.meal.app.resolve(InitializeDiningUseCase.token).execute(request);
            assert.equal(d.meal.app.catalog.restaurant('new-bbq').version, 1);
            assert.equal(d.meal.app.catalog.restaurants.length, 2);
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
            const guest = device(new DiningScenario.Meal(owner.meal.relay, 'guest', false), []);
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

        test('同一用户可以创建多个房间，离开后可以重新加入旧房间', async () => {
            const d = device();
            await d.sessions.initialize();
            await d.meal.createRoom('other', '654321', 20000);
            await d.sessions.createRoom(20000, 'My');
            assert.deepEqual(d.calls, ['allocate', 'watch:room']);
            assert.equal(d.preferences.lastRoom(), 'room');
            assert.equal(d.meal.dining.session()!.roomId, 'room');
            assert.equal(d.meal.app.collaboration.findRoom('other')!.status, 'ACTIVE');
            await d.sessions.leaveRoom();
            assert.equal(d.meal.dining.session(), undefined);
            d.gateway.locate = async code => ({roomId: code === '654321' ? 'other' : 'room'});
            await d.sessions.joinRoom('654321');
            assert.equal(d.meal.dining.session()!.roomId, 'other');
            await d.sessions.joinRoom('123456');
            assert.equal(d.meal.dining.session()!.roomId, 'room');
            assert.equal(d.meal.dining.room()!.members.find(m => m.id === d.meal.dining.identity().id)!.present, true);
        });

        test('加入已废弃房间仍由领域拒绝，应用流程释放连接', async () => {
            const owner = device();
            await owner.sessions.initialize();
            await owner.sessions.createRoom(20000, 'My');
            await owner.meal.dining.abandon();
            const guest = device(new DiningScenario.Meal(owner.meal.relay, 'guest', false), []);
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
            assert.ok(d.meal.app.collaboration.findRoom('room'));
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
