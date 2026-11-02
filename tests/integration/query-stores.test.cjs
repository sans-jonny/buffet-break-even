require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {computed, createSSRApp, watchEffect, nextTick, isReadonly} = require('vue')
const {onlineManager} = require('@tanstack/query-core')
const {Bootstrap} = require('../../src/composition/Bootstrap.ts')
const {DiningScenario} = require('../support/DiningScenario.ts')
const {DiningStore} = require('../../src/stores/business/DiningStore.ts')
const {IncreaseDiningProductUseCase} = require('../../src/coordination/application/port/in/dining/IncreaseDiningProductUseCase.ts')
const {InitializeDiningUseCase} = require('../../src/coordination/application/port/in/initialization/InitializeDiningUseCase.ts')
const {SessionStore} = require('../../src/stores/business/SessionStore.ts')

async function fixture(t) {
    let sequence = 0
    const storage = new DiningScenario.Storage()
    const app = Bootstrap.create({storage, id: () => `query-${++sequence}`, now: () => '2026-11-02T01:00:00.000Z'}, createSSRApp({}))
    t.after(app.dispose)
    const release = app.queries.acquire()
    t.after(release)
    DiningScenario.configureSessions(app, () => `query-${++sequence}`)
    const sessionStore = SessionStore.create(app, app.queries, app.pinia)
    t.after(() => sessionStore.$dispose())
    await app.resolve(InitializeDiningUseCase.token).execute(new InitializeDiningUseCase.Request())
    await app.catalog.publish(DiningScenario.restaurant())
    await sessionStore.startSingle(20000)
    return {app, storage, release, sessionStore}
}

test('同一 Pinia 根共享业务 Store；Page 直接读取属性，提交后由查询订阅更新', async t => {
    const {app, sessionStore} = await fixture(t)
    assert.equal(DiningStore.create(null, null, app.pinia), app.dining)
    const activityId = app.dining.sessionData.activityId
    const count = computed(() => app.accounting.consumption(activityId, 'buffet')?.rounds[0].items.shrimp || 0)
    const values = []
    const stop = watchEffect(() => values.push(count.value))
    t.after(stop)
    assert.equal(count.value, 0)
    await app.dining.edit('buffet', 'add', 'shrimp', 2)
    await nextTick()
    assert.equal(count.value, 2)
    assert.equal(values.at(-1), 2)
    assert.equal(app.catalog.restaurants[0].name, '同名餐厅')
    assert.ok(isReadonly(app.catalog.restaurants))
    assert.ok(isReadonly(app.dining.restaurantsData))
    assert.ok(Object.isFrozen(app.queries.client.getQueryData(['catalog', 'local'])[0]))
})

test('两个页面共享一个 observer；最后一页隐藏后停止订阅，重新显示刷新失效查询', async t => {
    const {app, release} = await fixture(t)
    const activityId = app.dining.sessionData.activityId
    const key = ['accounting', 'consumption', activityId, 'buffet']
    const view = computed(() => app.accounting.consumption(activityId, 'buffet'))
    assert.equal(view.value, undefined)
    const query = app.queries.client.getQueryCache().find({queryKey: key})
    const releaseSecond = app.queries.acquire()
    assert.equal(query.getObserversCount(), 1)
    release()
    assert.equal(query.getObserversCount(), 1)
    releaseSecond()
    assert.equal(query.getObserversCount(), 0)
    await app.resolve(IncreaseDiningProductUseCase.token).execute(new IncreaseDiningProductUseCase.Request(
        app.dining.sessionData, app.dining.identityData.id, 'buffet', 'shrimp', 3))
    assert.equal(query.state.isInvalidated, true)
    assert.equal(query.getObserversCount(), 0)
    const resume = app.queries.acquire()
    t.after(resume)
    assert.equal(query.getObserversCount(), 0) // Hidden pages' views are not eagerly resubscribed.
    void view.value // The resumed page renders its view and subscribes again.
    await app.queries.settled()
    assert.equal(view.value.rounds[0].items.shrimp, 3)
    assert.equal(query.getObserversCount(), 1)
})

test('多活动查询按 ID 隔离；切换当前会话不会覆盖另一个页面的消费结果', async t => {
    const {app, sessionStore} = await fixture(t)
    const oldId = app.dining.sessionData.activityId
    await app.dining.edit('buffet', 'add', 'shrimp', 2)
    const previous = computed(() => app.accounting.consumption(oldId, 'buffet'))
    assert.equal(previous.value.rounds[0].items.shrimp, 2)
    await sessionStore.startSingle(30000, undefined, oldId)
    const newId = app.dining.sessionData.activityId
    await app.dining.edit('buffet', 'add', 'shrimp', 5)
    assert.equal(app.accounting.consumption(newId, 'buffet').rounds[0].items.shrimp, 5)
    assert.equal(previous.value.rounds[0].items.shrimp, 2)
})

test('持久化失败不失效查询，刷新失败不会重发或否定已成功的命令', async t => {
    const {app, storage} = await fixture(t)
    const old = app.dining.activityData
    let invalidations = 0
    const stop = app.queries.client.getQueryCache().subscribe(event => {
        if (event.type === 'updated' && event.action.type === 'invalidate') invalidations++
    })
    t.after(stop)
    storage.fail = () => true
    await assert.rejects(app.dining.paying(12345), /DISK_FULL/)
    assert.equal(invalidations, 0)
    assert.equal(app.dining.activityData, old)
    storage.fail = undefined
    void app.catalog.restaurants
    app.queries.client.setQueryDefaults(['catalog', 'local'], {queryFn: () => { throw new Error('QUERY_FAILED') }})
    // Existing observers keep their own options; use the actual injected query function for failure.
    const query = app.queries.client.getQueryCache().find({queryKey: ['catalog', 'local']})
    query.setOptions({...query.options, queryFn: () => { throw new Error('QUERY_FAILED') }})
    await app.dining.paying(25000)
    assert.equal(app.dining.activityData.ticketPriceMinor, 25000)
    assert.equal(app.dining.error.message, 'QUERY_FAILED')
})

test('页面交互状态按活动与餐厅分槽，重复访问可恢复且不存业务 DTO', async t => {
    const {app, sessionStore} = await fixture(t)
    const a = app.menuPageState.state('activity-a/restaurant-a')
    a.activeCategory = 'seafood'
    a.showCart = true
    const b = app.menuPageState.state('activity-b/restaurant-a')
    assert.equal(b.activeCategory, '')
    assert.equal(b.showCart, false)
    assert.equal(app.menuPageState.state('activity-a/restaurant-a').activeCategory, 'seafood')
    assert.deepEqual(Object.keys(a).sort(), ['activeCategory', 'editingPrice', 'priceInput', 'showCart'])
})

test('断网时本地命令和已提交投影查询仍能完成', async t => {
    const {app, sessionStore} = await fixture(t)
    const activityId = app.dining.sessionData.activityId
    void app.accounting.consumption(activityId, 'buffet')
    onlineManager.setOnline(false)
    t.after(() => onlineManager.setOnline(true))
    await app.dining.edit('buffet', 'add', 'shrimp', 4)
    assert.equal(app.accounting.consumption(activityId, 'buffet').rounds[0].items.shrimp, 4)
})

test('Store 返回 Port.In 的命令 Response，查询缓存仍通过提交失效刷新', async t => {
    const {app, sessionStore} = await fixture(t)
    const oldId = app.dining.sessionData.activityId
    const response = await sessionStore.startSingle(25000, undefined, oldId)
    assert.equal(response.value.activityId, app.dining.sessionData.activityId)
    assert.notEqual(response.value.activityId, oldId)
    assert.equal(app.dining.activityData.ticketPriceMinor, 25000)
})
