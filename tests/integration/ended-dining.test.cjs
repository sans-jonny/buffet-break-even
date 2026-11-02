require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {nextTick} = require('vue')
const {pageHarness} = require('../helpers/pages.cjs')
const {DiningScenario} = require('../support/DiningScenario.ts')

const flush = async () => { await nextTick(); await new Promise(resolve => setImmediate(resolve)) }

test('从菜单打开结果页并结束单人用餐时，只返回 setup，不再次打开结果页', async t => {
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
    assert.deepEqual(app.calls, [['toResult'], ['open', 'setup', 'reset']])
    assert.equal(app.services.dining.activity().status, 'ENDED')
    assert.equal(app.services.personal.history().length, 1)
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

async function endedRoom(t, eligible) {
    const meal = await new DiningScenario.Meal().givenRestaurant()
    t.after(meal.app.dispose)
    await meal.givenRoom()
    await meal.dining.finish('room:buffet')
    const app = pageHarness()
    await app.ready
    t.after(app.services.dispose)
    const activity = meal.dining.activity(), room = meal.dining.room()
    await app.services.runtime.local(state => {
        state['personal/identity'] = eligible ? meal.dining.identity() : {id: 'outsider', nickname: '其他用户'}
        state['personal/session'] = meal.dining.session()
        state[`accounting/activity/${activity.id}`] = activity
        state[`collaboration/room/${room.id}`] = room
        // A previous deletion should be repaired only when entering the finished result.
        state[`personal/history-deleted/room/${activity.id}`] = true
    })
    await flush()
    return {app, activity}
}

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
