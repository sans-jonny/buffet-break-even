const test = require('node:test')
const assert = require('node:assert/strict')
const {pageHarness} = require('../helpers/pages.cjs')

test('页面由同一个 scope 解析查询单例，并持有独立绑定', async t => {
    const harness = pageHarness(), setup = harness.setup('setup'), creator = harness.setup('creator')
    t.after(setup.dispose); t.after(creator.dispose)
    await Promise.all([setup.ready, creator.ready]); t.after(harness.services.dispose)
    assert.ok(setup.state.personalQuery.data.value.identity.id)
    assert.ok(setup.state.catalogRestaurants.value.length > 0)
    assert.equal(setup.state.scope, creator.state.scope)
    assert.equal(setup.state.queries, creator.state.queries)
    assert.notEqual(setup.state.restaurantsQuery, creator.state.restaurantsQuery)
    assert.equal('dining' in setup.state, false)
})

test('餐厅选择属于页面状态，菜单、轮次与结果页面共享该选择', async t => {
    const harness = pageHarness()
    await harness.ready
    t.after(harness.services.dispose)
    await harness.services.sessionStore.startSingle(20000, 'sukiyaki')
    const menu = harness.setup('menu')
    t.after(menu.dispose)
    await menu.ready
    const restaurantId = harness.services.dining.restaurantsData.at(-1).id
    menu.state.selectRestaurant(restaurantId)
    const slip = harness.setup('order-slip'), result = harness.setup('result')
    t.after(slip.dispose); t.after(result.dispose)
    await Promise.all([slip.ready, result.ready])
    assert.equal(slip.state.selectedRestaurant.value, restaurantId)
    assert.equal(result.state.selectedRestaurant.value, restaurantId)
    assert.equal(harness.services.menuPageState.selectedRestaurants[harness.services.dining.sessionData.activityId], restaurantId)
})

test('页面只绑定一次生命周期，隐藏和卸载释放查询订阅', async t => {
    const harness = pageHarness(), setup = harness.setup('setup')
    await setup.ready
    t.after(harness.services.dispose); t.after(setup.dispose)
    void setup.state.cuisineTypes.value
    const query = harness.services.queries.client.getQueryCache().find({queryKey: ['catalog', 'local']})
    assert.equal(harness.hooks.onShow.length, 1)
    assert.equal(harness.hooks.onHide.length, 1)
    assert.equal(query.getObserversCount(), 1)
    harness.hooks.onHide[0]()
    assert.equal(query.getObserversCount(), 0)
    await harness.hooks.onShow[0]()
    void setup.state.cuisineTypes.value
    assert.equal(query.getObserversCount(), 1)
    setup.dispose()
    assert.equal(query.getObserversCount(), 0)
})
