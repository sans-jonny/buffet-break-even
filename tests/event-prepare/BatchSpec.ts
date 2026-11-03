import {DiningStarted} from '../../src/contexts/accounting/domain/event/DiningStarted'
import {TicketPriceChanged} from '../../src/contexts/accounting/domain/event/TicketPriceChanged'
import {ProductQuantityIncreased} from '../../src/contexts/accounting/domain/event/ProductQuantityIncreased'
import {SerializedEvent} from '../../src/kernel/application/SerializedEvent'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DiningScenario} from '../support/DiningScenario'
import {EventBatch} from '../../protocol/EventBatch'
import {Domain} from '../../src/kernel/domain/Domain'

export namespace BatchSpec {
    export function verify(): void {
        test('E3 派生失败：E1/E2 工作区、失效及远程提交全部丢弃', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenRoom()
            const before = meal.storage.get('app:head'), sent = meal.relay.sent;
            let notifications = 0
            meal.app.runtime.subscribe(() => notifications++)
            meal.app.runtime.on('ProductQuantityIncreased', async (_event, tx) => {
                await tx.stage(SerializedEvent.fact(new TicketPriceChanged(meal.dining.session()!.activityId, meal.dining.activity()!.version, { ticketPriceMinor: 10000 }), `accounting/activity/${meal.dining.session()!.activityId}`))
                throw new Error('E3_FAILED')
            })
            await assert.rejects(meal.whenEating(1, 'room:buffet', 'room:buffet:shrimp'), /E3_FAILED/)
            assert.equal(meal.storage.get('app:head'), before);
            assert.equal(meal.relay.sent, sent);
            assert.equal(notifications, 0)
        })
        test('PREPARE 读己之写；完整闭包只提交一次；回放不会再执行准备 Handler', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenSingle()
            let handled = 0
            meal.app.runtime.on('RoundSubmitted', async (event, tx) => {
                handled++
                assert.equal(tx.get<any>(event.key).rounds[0].status, 'SUBMITTED')
            })
            await meal.whenEating();
            await meal.whenSubmitting();
            assert.equal(handled, 1)
            const batches = meal.app.runtime.entries<EventBatch.Committed>('journal/').filter(b => b.scopeId === meal.dining.session()!.scopeId)
            const peer = new DiningScenario.Meal()
            for (const batch of meal.app.runtime.entries<EventBatch.Committed>('journal/').filter(b => b.scopeId === 'local-catalog')) await peer.app.runtime.projectCommitted(batch)
            peer.app.runtime.on('RoundSubmitted', async () => {
                throw new Error('MUST_NOT_RUN')
            })
            for (const batch of batches) await peer.app.runtime.projectCommitted(batch)
            assert.equal(peer.app.runtime.get<any>(`accounting/consumption/${meal.dining.session()!.activityId}/buffet`).rounds.length, 2)
        })
        test('准备事件循环达到上限后拒绝，远程没有任何追加', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenRoom()
            const sent = meal.relay.sent
            meal.app.runtime.on('ProductQuantityIncreased', async (event, tx) => {
                const previous = SerializedEvent.decode<ProductQuantityIncreased>(event); await tx.stage(SerializedEvent.fact(new ProductQuantityIncreased(previous.aggregateId, previous.expectedVersion + 1, previous.facts), event.key))
            })
            await assert.rejects(meal.whenEating(1, 'room:buffet', 'room:buffet:shrimp'), /EVENT_CYCLE_LIMIT/)
            assert.equal(meal.relay.sent, sent)
        })
        test('未知事件或未来 schema 整批 BLOCKED，状态与 cursor 不推进', async () => {
            for (const event of [{
                type: 'FutureFact',
                schemaVersion: 1,
                key: 'future',
                payload: {}
            }, {type: 'DiningStarted', schemaVersion: 999, key: 'accounting/activity/a', payload: {}}]) {
                const meal = new DiningScenario.Meal()
                const batch = EventBatch.commit({submissionId: 'test-submission',
                    scopeId: 'room',
                    roomId: 'room',
                    expectedVersion: 0,
                    events: [event]
                }, 'b')
                meal.relay.streams.set('room', [batch])
                await assert.rejects(meal.app.runtime.synchronize('room'), /BLOCKED_UNKNOWN_EVENT/)
                assert.equal(meal.app.runtime.get('cursor/room'), undefined);
                assert.equal(meal.app.runtime.sync.get('room'), 'BLOCKED')
            }
        })
        test('批次重复忽略、缺口及半批次拒绝', async () => {
            const meal = new DiningScenario.Meal()
            const batch = EventBatch.commit({submissionId: 'test-submission',
                scopeId: 'x',
                roomId: null,
                expectedVersion: 0,
                events: [SerializedEvent.fact(new DiningStarted('a', 0, {mode:'SINGLE',ticketPriceMinor:20000,restaurantIds:['buffet'],restaurantCategoryId:'My'}), 'accounting/activity/a'), SerializedEvent.fact(new DiningStarted('b', 0, {mode:'SINGLE',ticketPriceMinor:20000,restaurantIds:['buffet'],restaurantCategoryId:'My'}), 'accounting/activity/b')]
            }, 'b')
            await assert.rejects(meal.app.runtime.projectCommitted({
                ...batch,
                events: batch.events.slice(0, 1)
            }), /INCOMPLETE_BATCH/)
            await assert.rejects(meal.app.runtime.projectCommitted({
                ...batch,
                previousVersion: 5,
                fromVersion: 6,
                toVersion: 7,
                events: batch.events.map((e, i) => ({...e, version: 6 + i, streamVersion: 6 + i}))
            }), /EVENT_GAP/)
            await meal.app.runtime.projectCommitted(batch);
            const head = meal.storage.get('app:head')
            await meal.app.runtime.projectCommitted(batch);
            assert.equal(meal.storage.get('app:head'), head)
        })
        test('PROJECT_COMMITTED 的异步本地 Handler 失败时整批状态和 cursor 均不发布', async () => {
            const meal = new DiningScenario.Meal()
            const batch = EventBatch.commit({submissionId: 'test-submission',
                scopeId: 'x',
                roomId: null,
                expectedVersion: 0,
                events: [SerializedEvent.fact(new DiningStarted('a', 0, {mode:'SINGLE',ticketPriceMinor:20000,restaurantIds:['buffet'],restaurantCategoryId:'My'}), 'accounting/activity/a')]
            }, 'b')
            meal.app.runtime.onCommitted('DiningStarted', async (_event, state) => {
                state['derived/a'] = 1;
                await Promise.resolve();
                throw new Error('LOCAL_HANDLER_FAILED')
            })
            await assert.rejects(meal.app.runtime.projectCommitted(batch), /LOCAL_HANDLER_FAILED/)
            assert.equal(meal.app.runtime.get('cursor/x'), undefined)
            assert.equal(meal.app.runtime.get('accounting/activity/a'), undefined)
            assert.equal(meal.app.runtime.get('derived/a'), undefined)
        })
    }
}
