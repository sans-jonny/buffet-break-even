import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DiningScenario} from '../support/DiningScenario';
import {DiningActivityRepository} from '../../src/contexts/accounting/application/port/out/DiningActivityRepository';
import {RestaurantConsumptionRepository} from '../../src/contexts/accounting/application/port/out/RestaurantConsumptionRepository';
import {DiningRoomRepository} from '../../src/contexts/collaboration/application/port/out/DiningRoomRepository';
import {RestaurantConsumption} from '../../src/contexts/accounting/domain/aggregate/RestaurantConsumption';
import {DiningActivity} from '../../src/contexts/accounting/domain/aggregate/DiningActivity';
import {Money} from '../../src/contexts/accounting/domain/value-object/Money';
import {Domain} from '../../src/kernel/domain/Domain';
import {AggregateConflictError} from '../../src/kernel/application/AggregateConflictError';
import {EventBatch} from '../../protocol/EventBatch';
import {StreamConflictError} from '../../src/kernel/application/StreamConflictError';
export namespace RepositorySpec {
    export function verify(): void {
        test('Repository apply 无事务时自动提交，返回新聚合并按聚合版本拒绝旧事件', async t => {
            const meal = await new DiningScenario.Meal().givenRestaurant(); await meal.givenSingle();
            const repository = meal.app.resolve(RestaurantConsumptionRepository.token);
            const spy = t.mock.method(meal.app.runtime, 'run', meal.app.runtime.run.bind(meal.app.runtime));
            const activityId = meal.dining.session()!.activityId;
            const first = (await repository.apply(RestaurantConsumption.create(activityId, 'buffet', 'round')))!;
            assert.equal(spy.mock.callCount(), 1);
            assert.equal(first.version, 1); assert.equal(first.rounds[0].id, 'round');
            const event = Domain.accepted(first.increaseProduct('round', 'shrimp', 2));
            assert.deepEqual(Object.keys(event).sort(), ['aggregateId', 'expectedVersion', 'facts', 'type']);
            assert.equal('payload' in event, false); assert.equal('snapshot' in event, false);
            const changed = (await repository.apply(event))!;
            assert.equal(changed.version, 2); assert.equal(changed.rounds[0].items.shrimp, 2);
            assert.equal(first.rounds[0].items.shrimp, undefined);
            await assert.rejects(repository.apply(event), (error: unknown) => error instanceof AggregateConflictError && error.expectedVersion === 1 && error.actualVersion === 2);
            assert.equal(repository.findById(first.id)!.rounds[0].items.shrimp, 2);
            (changed.rounds[0].items as Record<string, number>).shrimp = 900;
            assert.equal(repository.findById(first.id)!.rounds[0].items.shrimp, 2);
        });
        test('串行 apply 共享工作区并只提交一次，后续版本冲突回滚前面全部修改', async t => {
            const meal = await new DiningScenario.Meal().givenRestaurant(); await meal.givenSingle(); await meal.whenEating();
            const session = meal.dining.session()!, id = session.activityId + '/buffet';
            const committed = meal.app.resolve(RestaurantConsumptionRepository.token);
            const spy = t.mock.method(meal.app.runtime, 'run', meal.app.runtime.run.bind(meal.app.runtime));
            let retained!: RestaurantConsumptionRepository;
            await meal.app.runtime.run(session.scopeId, null, async tx => {
                retained = meal.app.scope(tx).resolve(RestaurantConsumptionRepository.token);
                const before = retained.findById(id)!, round = before.activeRoundId()!;
                const first = (await retained.apply(before.increaseProduct(round, 'shrimp', 1)))!;
                assert.equal(retained.findById(id)!.version, first.version);
                assert.equal(committed.findById(id)!.rounds[0].items.shrimp, 1);
                await retained.apply(first.increaseProduct(round, 'shrimp', 2));
            });
            assert.equal(spy.mock.callCount(), 1); assert.equal(committed.findById(id)!.rounds[0].items.shrimp, 4);
            assert.throws(() => retained.findById(id), /INVALID_TRANSACTION_CONTEXT/);
            const head = meal.storage.get('app:head');
            await assert.rejects(meal.app.runtime.run(session.scopeId, null, async tx => {
                const repository = meal.app.scope(tx).resolve(RestaurantConsumptionRepository.token);
                const before = repository.findById(id)!, event = before.increaseProduct(before.activeRoundId()!, 'shrimp', 1);
                await repository.apply(event);
                await repository.apply(event);
            }), AggregateConflictError);
            assert.equal(meal.storage.get('app:head'), head); assert.equal(committed.findById(id)!.rounds[0].items.shrimp, 4);
            await assert.rejects(meal.app.runtime.run(session.scopeId, null, async tx => {
                const repository = meal.app.scope(tx).resolve(RestaurantConsumptionRepository.token);
                const before = repository.findById(id)!, event = before.increaseProduct(before.activeRoundId()!, 'shrimp', 1);
                await repository.apply(event);
                try { await repository.apply(event); } catch { /* The unit remains failed even if a caller catches the conflict. */ }
            }), AggregateConflictError);
            assert.equal(committed.findById(id)!.rounds[0].items.shrimp, 4);
        });
        test('多人不同 Repository apply 共用一个事件流，事务结束前不发送，回放先更新游标', async t => {
            const host = await new DiningScenario.Meal().givenRestaurant(); await host.givenRoom();
            const session = host.dining.session()!, sent = host.relay.sent;
            const append = t.mock.method(host.relay, 'append', host.relay.append.bind(host.relay));
            await host.app.runtime.run('room', 'room', async tx => {
                const scope = host.app.scope(tx);
                const activities = scope.resolve(DiningActivityRepository.token);
                const rooms = scope.resolve(DiningRoomRepository.token);
                await activities.apply(activities.findById(session.activityId)!.changeTicketPrice(Money.ofMinor(21000)));
                await rooms.apply(rooms.findById('room')!.join('guest', 'Guest', '2026-11-01T00:00:00Z'));
                assert.equal(host.relay.sent, sent);
            });
            assert.equal(append.mock.callCount(), 1);
            const candidate = append.mock.calls[0].arguments[0] as EventBatch.Candidate;
            assert.deepEqual(candidate.events.map(e => e.streamVersion), [candidate.expectedVersion + 1, candidate.expectedVersion + 2]);
            const batch = host.relay.streams.get('room')!.slice(-1)[0];
            assert.deepEqual(batch.events.map(e => e.type), ['TicketPriceChanged', 'MemberJoined']);
            const peer = new DiningScenario.Meal(host.relay, 'peer');
            peer.app.runtime.on('TicketPriceChanged', async () => { throw new Error('REPLAY_MUST_NOT_PREPARE'); });
            peer.app.runtime.onCommitted('TicketPriceChanged', async (_event, state) => { assert.equal(state['cursor/room'], batch.toVersion); });
            await peer.app.runtime.synchronize('room');
            assert.equal(peer.app.runtime.get<{ticketPriceMinor: number}>(`accounting/activity/${session.activityId}`)!.ticketPriceMinor, 21000);
            assert.equal(host.relay.sent, sent + 1);
            const rooms = host.app.resolve(DiningRoomRepository.token);
            await rooms.apply(rooms.findById('room')!.transferHost(host.dining.identity().id, 'guest'));
            assert.equal(host.relay.sent, sent + 2);
        });
        test('冲突响应携带的缺失批次先应用，丢弃旧候选事实并重新计算命令', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant(); await meal.givenRoom(); await meal.whenEating(1, 'room:buffet', 'room:buffet:shrimp');
            const peer = new DiningScenario.Meal(meal.relay, 'peer'); await peer.initialize(); await peer.joinRoom('room');
            const append = meal.relay.append.bind(meal.relay);
            meal.relay.append = async candidate => {
                try { return await append(candidate); }
                catch (error) {
                    if ((error as Error).message !== 'VERSION_CONFLICT') throw error;
                    throw new StreamConflictError(await meal.relay.read('room', candidate.expectedVersion));
                }
            };
            meal.relay.beforeAppend = async () => { await peer.whenEating(2, 'room:buffet', 'room:buffet:shrimp'); };
            await meal.whenEating(1, 'room:buffet', 'room:buffet:shrimp');
            meal.thenQuantityIs(4, 'room:buffet', 'room:buffet:shrimp');
            const events = meal.relay.streams.get('room')!.flatMap(b => b.events).filter(e => e.type === 'ProductQuantityIncreased');
            assert.equal(events.length, 3);
            assert.equal(meal.app.runtime.get('cursor/room'), meal.relay.streams.get('room')!.slice(-1)[0].toVersion);
        });
        test('聚合字段直接公开 readonly 业务视图，导出快照和构造输入均与实例脱离', () => {
            const snapshot: DiningActivity.State = {id: 'meal', version: 1, mode: 'SINGLE', status: 'ACTIVE', ticketPriceMinor: 20000, restaurantIds: ['buffet'], restaurantCategoryId: 'My'};
            const activity = DiningActivity.reconstitute(snapshot);
            assert.equal('state' in activity, false); assert.equal(Object.isFrozen(activity), false);
            assert.equal(activity.ticketPriceMinor, 20000);
            const detached = activity.snapshot() as {ticketPriceMinor: number}; detached.ticketPriceMinor = 1;
            (snapshot as {ticketPriceMinor: number}).ticketPriceMinor = 2;
            assert.equal(activity.ticketPriceMinor, 20000);
        });
    }
}
