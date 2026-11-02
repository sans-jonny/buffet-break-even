require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {nextTick} = require('vue')
const {pageHarness} = require('../helpers/pages.cjs')
const {DiningScenario} = require('../support/DiningScenario.ts')
const {loadModule} = require('../helpers/runtime.cjs')

const flush = async () => { await nextTick(); await new Promise(resolve => setImmediate(resolve)) }

test('结束单人用餐后停留结果页，主动返回首页才进入 setup', async t => {
    const app = pageHarness()
    await app.ready
    t.after(app.services.dispose)
    await app.services.sessionStore.startSingle(10000, 'sukiyaki')
    const menu = app.setup('menu')
    t.after(menu.dispose)
    await menu.ready
    await menu.state.finish()
    const result = app.setup('result')
    t.after(result.dispose)
    await result.ready
    result.state.endDining()
    await result.state.confirmation.confirm()
    await flush()
    assert.deepEqual(app.calls, [['toResult']])
    assert.equal(app.services.dining.activity().status, 'ENDED')
    assert.equal(app.services.personal.history().length, 1)
    assert.equal(result.state.viewMode.value, 'single-ended')
    await result.state.secondaryAction.value.run()
    assert.deepEqual(app.calls, [['toResult'], ['open', 'setup', 'reset']])
})

test('菜单收到结束状态后替换为结果页，重新进入已结束菜单也跳转', async t => {
    const app = pageHarness()
    await app.ready
    t.after(app.services.dispose)
    await app.services.sessionStore.startSingle(10000, 'sukiyaki')
    const menu = app.setup('menu')
    t.after(menu.dispose)
    await menu.ready
    await app.services.dining.finish(menu.state.restaurantId.value)
    await flush()
    assert.deepEqual(app.calls, [['toResult', undefined, 'replace']])
    menu.dispose()
    const reopened = app.setup('menu')
    t.after(reopened.dispose)
    await reopened.ready
    await flush()
    assert.equal(app.calls.length, 2)
})

test('隐藏菜单和菜单预览不会因当前用餐结束抢占页面', async t => {
    const app = pageHarness()
    await app.ready
    t.after(app.services.dispose)
    await app.services.sessionStore.startSingle(10000, 'sukiyaki')
    const menu = app.setup('menu')
    t.after(menu.dispose)
    await menu.ready
    for (const hide of app.hooks.onHide) hide()
    await app.services.dining.finish(menu.state.restaurantId.value)
    await flush()
    assert.equal(app.calls.length, 0)
    const preview = app.setup('menu', {previewId: menu.state.restaurantId.value})
    t.after(preview.dispose)
    await preview.ready
    await flush()
    assert.equal(app.calls.length, 0)
})

async function endedRoom(t, eligible, options = {}) {
    const meal = await new DiningScenario.Meal().givenRestaurant()
    t.after(meal.app.dispose)
    await meal.givenRoom()
    if (!options.active) await meal.dining.finish('room:buffet')
    const app = pageHarness(options)
    await app.ready
    t.after(app.services.dispose)
    const activity = meal.dining.activity(), room = meal.dining.room()
    t.mock.method(app.services.runtime.remote, 'read', meal.relay.read.bind(meal.relay))
    t.mock.method(app.services.runtime.remote, 'append', meal.relay.append.bind(meal.relay))
    t.after(meal.relay.listen(batch => { void app.services.runtime.projectCommitted(batch).catch(() => {}); }))
    t.mock.method(app.services.runtime, 'roomBaseline', async () => {})
    await app.services.runtime.local(state => {
        state['personal/identity'] = eligible ? meal.dining.identity() : {id: 'outsider', nickname: '其他用户'}
        state['personal/session'] = meal.dining.session()
        state[`accounting/activity/${activity.id}`] = activity
        state[`collaboration/room/${room.id}`] = room
        state[`cursor/${room.id}`] = meal.relay.streams.get(room.id).at(-1).toVersion
        state['catalog/room/restaurant/room:buffet'] = meal.app.runtime.get('catalog/room/restaurant/room:buffet')
        // A previous deletion should be repaired only when entering the finished result.
        state[`personal/history-deleted/room/${activity.id}`] = true
    })
    await flush()
    return {app, activity}
}

test('结束多人用餐后停留结果页并保留房间，主动返回首页才离房', async t => {
    const {app} = await endedRoom(t, true, {active: true})
    const result = app.setup('result')
    t.after(result.dispose)
    await result.ready
    assert.equal(result.state.viewMode.value, 'room-host')
    result.state.endRoom()
    await result.state.confirmation.confirm()
    await flush()
    assert.deepEqual(app.calls, [])
    assert.equal(result.state.viewMode.value, 'room-ended')
    assert.equal(app.services.dining.session().roomId, 'room')
    assert.equal(app.services.dining.room().status, 'ENDED')
    assert.ok(result.state.displayReceipt.value.id)
    assert.equal(app.services.personal.history().length, 1)
    await result.state.secondaryAction.value.run()
    assert.deepEqual(app.calls, [['open', 'setup', 'reset']])
    assert.equal(app.services.dining.session(), undefined)
})

test('有资格成员进入已结束结果自动补全缺失历史，重复进入不重复写入', async t => {
    const {app, activity} = await endedRoom(t, true)
    const result = app.setup('result')
    t.after(result.dispose)
    await result.ready
    assert.equal(app.services.personal.history().length, 1)
    assert.deepEqual(JSON.parse(JSON.stringify(app.services.personal.history()[0])), activity.result)
    assert.equal(result.state.displayReceipt.value.restaurant, activity.result.restaurant)
    const save = t.mock.method(app.services.personal, 'saveHistory', () => { throw new Error('DUPLICATE_SAVE') })
    const reopened = app.setup('result')
    t.after(reopened.dispose)
    await reopened.ready
    assert.equal(save.mock.callCount(), 0)
    await result.state.goBack()
    assert.deepEqual(app.calls.at(-1), ['open', 'setup', 'reset'])
})

test('无结算资格的用户及收藏预览不会补全房间历史', async t => {
    const {app} = await endedRoom(t, false)
    const result = app.setup('result')
    t.after(result.dispose)
    await result.ready
    assert.equal(app.services.personal.history().length, 0)
    const eligible = (await endedRoom(t, true)).app
    const saved = eligible.setup('result', {receiptId: 'saved'})
    t.after(saved.dispose)
    await saved.ready
    assert.equal(eligible.services.personal.history().length, 0)
})

test('多人结果返回首页期间，即使旧菜单触发 onShow 也不会再次跳转结果页', async t => {
    let pages = [{route: 'pages/menu/index'}], reset, app
    const nativeCalls = []
    const {UniBuffetNavigation} = loadModule('ui/navigation/UniBuffetNavigation', {
        redirectTo: options => {
            nativeCalls.push(['redirectTo', options.url])
            if (reset) return options.fail(new Error('navigation busy'))
            pages = [{route: options.url.replace(/^\//, '')}]
            options.success()
        },
        reLaunch: options => {
            nativeCalls.push(['reLaunch', options.url]); reset = options
            // Some platforms briefly show the old stack while reLaunch tears it down.
            pages = [{route: 'pages/menu/index'}]
            for (const show of app.hooks.onShow || []) show()
        }
    }, new Map(), {getCurrentPages: () => pages})
    const nav = new UniBuffetNavigation()
    const navigation = Object.fromEntries(['open', 'back', 'toResult', 'isNavigating'].map(method => [method, nav[method].bind(nav)]))
    app = (await endedRoom(t, true, {pages: () => pages, navigation})).app
    const menu = app.setup('menu')
    t.after(menu.dispose)
    await menu.ready
    await flush()
    const result = app.setup('result')
    t.after(result.dispose)
    await result.ready
    const returning = result.state.finishShared()
    const duplicate = result.state.finishShared()
    assert.equal(returning, duplicate)
    await flush()
    assert.deepEqual(nativeCalls, [['redirectTo', '/pages/result/index'], ['reLaunch', '/pages/setup/index']])
    pages = [{route: 'pages/setup/index'}]
    reset.success()
    await returning
    await flush()
    assert.equal(nativeCalls.length, 2)
    assert.deepEqual(app.toasts, [])
})
