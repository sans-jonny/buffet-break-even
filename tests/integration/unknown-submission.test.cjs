require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {DiningScenario} = require('../support/DiningScenario.ts')
const {SessionStore} = require('../../src/stores/business/SessionStore.ts')
const {RoomConnection} = require('../../src/coordination/application/port/out/session/RoomConnection.ts')
const {pageHarness} = require('../helpers/pages.cjs')

test('未确认加菜后仍能离房，保留未确认记录，重新加入只核对不重发加菜', async t => {
    const meal = await new DiningScenario.Meal().givenRestaurant()
    t.after(meal.app.dispose)
    await meal.givenRoom()
    const sessions = SessionStore.create(meal.app, meal.app.queries, meal.app.pinia)
    t.after(() => sessions.$dispose())
    const stopped = t.mock.method(meal.app.resolve(RoomConnection.token), 'stop', () => {})
    meal.relay.loseResponse = true
    await assert.rejects(meal.whenEating(1, 'room:buffet', 'room:buffet:shrimp'), /UNKNOWN_COMMIT_OUTCOME/)
    const sent = meal.relay.sent
    await sessions.exitMenu()
    assert.equal(meal.dining.session(), undefined)
    assert.equal(stopped.mock.callCount(), 1)
    assert.equal(meal.relay.sent, sent)
    assert.ok(meal.app.runtime.get('outcome/room'))
    meal.relay.loseResponse = false
    await meal.joinRoom('room')
    assert.equal(meal.app.runtime.get('outcome/room'), undefined)
    meal.thenQuantityIs(1, 'room:buffet', 'room:buffet:shrimp')
    assert.equal(meal.relay.sent, sent)
    await meal.whenEating(1, 'room:buffet', 'room:buffet:shrimp')
    meal.thenQuantityIs(2, 'room:buffet', 'room:buffet:shrimp')
})

test('菜单捕获提交待确认错误并提供核对入口，核对不重复加菜且恢复后可继续操作', async t => {
    const meal = await new DiningScenario.Meal().givenRestaurant()
    t.after(meal.app.dispose)
    await meal.givenRoom()
    const app = pageHarness()
    await app.ready
    t.after(app.services.dispose)
    t.mock.method(app.services.runtime.remote, 'read', meal.relay.read.bind(meal.relay))
    t.mock.method(app.services.runtime.remote, 'append', meal.relay.append.bind(meal.relay))
    t.after(meal.relay.listen(batch => { void app.services.runtime.projectCommitted(batch).catch(() => {}); }))
    t.mock.method(app.services.runtime, 'roomBaseline', async () => {})
    await app.services.runtime.local(state => {
        const activity = meal.dining.activity()
        state['personal/identity'] = meal.dining.identity(); state['personal/session'] = meal.dining.session()
        state[`accounting/activity/${activity.id}`] = activity
        state['collaboration/room/room'] = meal.dining.room()
        state['catalog/room/restaurant/room:buffet'] = meal.app.runtime.get('catalog/room/restaurant/room:buffet')
        state['cursor/room'] = meal.relay.streams.get('room').at(-1).toVersion
    })
    const menu = app.setup('menu')
    t.after(menu.dispose)
    await menu.ready
    const product = menu.state.products.value[0].id
    meal.relay.loseResponse = true
    await menu.state.addItem(product)
    assert.equal(menu.state.submissionPending.value, true)
    const sent = meal.relay.sent
    await menu.state.addItem(product)
    assert.equal(meal.relay.sent, sent)
    meal.relay.loseResponse = false
    await menu.state.recoverSubmission()
    assert.equal(menu.state.submissionPending.value, false)
    assert.equal(menu.state.totalSelectedCount.value, 1)
    assert.equal(meal.relay.sent, sent)
    await menu.state.addItem(product)
    assert.equal(menu.state.totalSelectedCount.value, 2)
})
