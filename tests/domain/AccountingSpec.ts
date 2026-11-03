import {CreateDiningActivityUseCase} from '../../src/contexts/accounting/application/port/in/CreateDiningActivityUseCase';
import {DomainScenario} from '../support/DomainScenario'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DiningScenario} from '../support/DiningScenario'
import {DiningActivity} from '../../src/contexts/accounting/domain/aggregate/DiningActivity'
import {RestaurantConsumption} from '../../src/contexts/accounting/domain/aggregate/RestaurantConsumption'
import {Domain} from '../../src/kernel/domain/Domain'
import {Money} from '../../src/contexts/accounting/domain/value-object/Money'

export namespace AccountingSpec {
    export function verify(): void {
        test('金额 DSL 使用最小单位，乘法和加法分别检查溢出且保持值对象不可变', () => {
            const ticket = Money.ofMinor(20000), food = Money.ofMinor(1500).times(2)
            assert.equal(food.minus(ticket).minor, -17000)
            assert.equal(ticket.minor, 20000)
            assert.throws(() => Money.ofMinor(Number.MAX_SAFE_INTEGER).plus(Money.ofMinor(1)), /MONEY_OVERFLOW/)
            assert.throws(() => Money.ofMinor(Number.MAX_SAFE_INTEGER).times(2), /MONEY_OVERFLOW/)
            assert.equal(Object.isFrozen(ticket), false)
        })
        test('总门票大于零且使用安全整数；领域失败不会改变对象', () => {
            for (const price of [0, -1, 1.1, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => new CreateDiningActivityUseCase.Request({scopeId: 'meal', roomId: null}, 'meal', price, true, ['buffet'], 'My'), /INVALID_TICKET_PRICE|MONEY_OVERFLOW/)
            const started = Domain.accepted(DiningActivity.create('meal', Money.ofMinor(20000), 'SINGLE', ['buffet'], 'My'))
            const model = DiningActivity.reconstitute(DomainScenario.activity(started))
            assert.equal(Domain.accepted(model.changeTicketPrice(Money.ofMinor(30000))).facts.ticketPriceMinor, 30000)
            assert.equal(started.facts.ticketPriceMinor, 20000)
            assert.equal('payload' in started, false); assert.equal(model.ticketPriceMinor, 20000)
        })
        test('未提交与已提交轮次都计价；提交原子创建下一轮并保留稳定 ID', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenSingle()
            await meal.whenEating(2);
            meal.thenValueIs(3000)
            const id = meal.dining.consumption('buffet')!.rounds[0].id
            await meal.whenSubmitting();
            await meal.whenEating(1)
            meal.thenValueIs(4500).thenQuantityIs(3)
            const rounds = meal.dining.consumption('buffet')!.rounds
            assert.equal(rounds[0].id, id);
            assert.equal(rounds[0].status, 'SUBMITTED');
            assert.equal(rounds[1].status, 'ACTIVE')
            const journal = meal.app.runtime.entries<{
                events: { type: string }[]
            }>('journal/').find(b => b.events[0].type === 'RoundSubmitted')!
            assert.deepEqual(journal.events.map(e => e.type), ['RoundSubmitted', 'RoundCreated'])
        })
        test('空轮不能提交，数量不足整次拒绝，清空保留当前轮', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenSingle()
            await assert.rejects(meal.dining.submit('buffet'), /EMPTY_ROUND/)
            await meal.whenEating(2)
            await assert.rejects(meal.dining.edit('buffet', 'reduce', 'shrimp', 3), /INSUFFICIENT_QUANTITY/)
            meal.thenQuantityIs(2)
            const id = meal.dining.consumption('buffet')!.rounds[0].id
            await meal.dining.edit('buffet', 'clear');
            meal.thenQuantityIs(0)
            assert.equal(meal.dining.consumption('buffet')!.rounds[0].id, id)
            await meal.whenEating();
            await meal.dining.edit('buffet', 'remove', 'shrimp');
            await meal.whenEating();
            meal.thenQuantityIs(1)
        })
        test('已提交轮次不开放用户编辑，删除商品只保留空的未提交轮', () => {
            const state = DomainScenario.consumption(RestaurantConsumption.create('a', 'r', 'round'))
            const withItems = DomainScenario.consumption(Domain.accepted(RestaurantConsumption.reconstitute(state).increaseProduct('round','p', 1)), state)
            const locked = DomainScenario.consumption(Domain.accepted(RestaurantConsumption.reconstitute(withItems).submitRound('round')), withItems)
            assert.deepEqual({...RestaurantConsumption.reconstitute(locked).clearRound('round')}, {rejected: 'ROUND_LOCKED'})
            const next = DomainScenario.consumption(Domain.accepted(RestaurantConsumption.reconstitute(locked).createNextRound('next')), locked)
            const cleaned = DomainScenario.consumption(Domain.accepted(RestaurantConsumption.reconstitute(next).retainProducts([])), next)
            assert.deepEqual(cleaned.rounds, [{id: 'next', status: 'ACTIVE', items: {}}])
        })
        test('调价影响已提交轮，删除对账同批完成，已存小票保持冻结', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenSingle();
            await meal.whenEating(2);
            await meal.whenSubmitting()
            await meal.app.personal.saveReceipt(meal.dining.preview('buffet'))
            await meal.givenRestaurant({
                version: 2,
                products: [{id: 'shrimp', name: '虾', categoryId: 'seafood', priceMinor: 2000}]
            })
            meal.thenValueIs(4000);
            assert.equal(meal.app.personal.receipt()!.foodValueMinor, 3000)
            await meal.givenRestaurant({version: 3, products: []})
            meal.thenValueIs(0);
            assert.equal(meal.dining.consumption('buffet')!.rounds.length, 1)
        })
        test('多家餐厅共用总票价；只有显式最终餐厅进入历史，重复结束拒绝', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenRestaurant({id: 'other'});
            await meal.givenSingle()
            await meal.whenEating(2);
            await meal.whenEating(4, 'other')
            await assert.rejects(meal.dining.finish(''), /FINAL_RESTAURANT_REQUIRED/)
            await meal.dining.finish('buffet')
            assert.equal(meal.app.personal.history().length, 1)
            assert.equal(meal.app.personal.history()[0].foodValueMinor, 3000)
            assert.equal(meal.app.personal.history()[0].netMinor, -17000)
            assert.equal(meal.dining.consumption('buffet')!.rounds[0].status, 'SUBMITTED')
            await assert.rejects(meal.dining.finish('other'), /ALREADY_ENDED/)
            await meal.app.personal.saveHistory(meal.dining.session(), meal.dining.activity()?.result);
            assert.equal(meal.app.personal.history().length, 1)
        })
        test('零菜品可以完成；已删除餐厅不可以完成；放弃不产生历史', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenSingle()
            await meal.dining.finish('buffet');
            assert.equal(meal.app.personal.history()[0].netMinor, -20000)
            await meal.startSingle(10000);
            await meal.app.catalog.remove('buffet')
            await assert.rejects(meal.dining.finish('buffet'), /RESTAURANT_UNAVAILABLE/)
            await meal.dining.abandon();
            assert.equal(meal.app.personal.history().length, 1)
        })
        test('单人活动至多一个；重启可恢复；副本和返回 DTO 不能改写可信状态', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenSingle();
            await meal.whenEating(2)
            await assert.rejects(meal.startSingle(10000), /SINGLE_ACTIVITY_EXISTS/)
            const activity = meal.dining.activity()! as any;
            assert.throws(() => {activity.ticketPriceMinor = 1}, TypeError)
            assert.equal(meal.dining.activity()!.ticketPriceMinor, 20000)
            const restarted = new DiningScenario.Meal();
            for (const [key, value] of meal.storage.values) restarted.storage.values.set(key, value)
            restarted.thenValueIs(3000)
        })
        test('单人同 scope 并发加量不会丢失更新；金额溢出不会发布结果', async () => {
            const meal = await new DiningScenario.Meal().givenRestaurant();
            await meal.givenSingle()
            await Promise.all(Array.from({length: 10}, () => meal.dining.edit('buffet', 'add', 'shrimp')))
            meal.thenQuantityIs(10)
            await meal.givenRestaurant({
                version: 2,
                products: [{id: 'shrimp', name: '虾', categoryId: 'seafood', priceMinor: Number.MAX_SAFE_INTEGER}]
            })
            await assert.rejects(meal.dining.finish('buffet'), /MONEY_OVERFLOW/)
            assert.equal(meal.dining.activity()!.status, 'ACTIVE')
        })
    }
}
