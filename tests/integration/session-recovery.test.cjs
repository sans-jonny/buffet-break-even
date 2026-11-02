require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {DiningScenario} = require('../support/DiningScenario.ts')
const {LocalDiningData} = require('../../src/coordination/application/port/out/device/LocalDiningData.ts')
const {SessionStore} = require('../../src/stores/business/SessionStore.ts')

async function room(t) {
    const meal = await new DiningScenario.Meal().givenRestaurant()
    t.after(meal.app.dispose)
    await meal.givenRoom()
    return meal
}

test('创建空房间后退出菜单，仍可加入上次房间并继续点餐', async t => {
    const meal = await new DiningScenario.Meal().givenRestaurant()
    t.after(meal.app.dispose)
    const sessions = SessionStore.create(meal.app, meal.app.queries, meal.app.pinia)
    t.after(() => sessions.$dispose())
    await sessions.createRoom(20000, 'My')
    const previous = meal.dining.session()
    await sessions.exitMenu()
    assert.equal(meal.dining.session(), undefined)
    assert.equal(meal.app.collaboration.findRoom(previous.roomId).status, 'ACTIVE')
    await sessions.joinRoom()
    assert.deepEqual(meal.dining.session(), previous)
    assert.equal(meal.dining.activity().status, 'ACTIVE')
    assert.equal(meal.dining.room().hostId, meal.dining.identity().id)
    const restaurant = meal.dining.restaurants()[0]
    const productId = restaurant.products[0].id
    await meal.whenEating(1, restaurant.id, productId)
    meal.thenQuantityIs(1, restaurant.id, productId)
})

test('多人创建已提交但选择失败时，仅恢复会话，不再分配或创建房间', async t => {
    const meal = await new DiningScenario.Meal().givenRestaurant()
    t.after(meal.app.dispose)
    const sessions = SessionStore.create(meal.app, meal.app.queries, meal.app.pinia)
    t.after(() => sessions.$dispose())
    const data = meal.app.resolve(LocalDiningData.token), select = data.selectSession.bind(data)
    let fail = true
    t.mock.method(data, 'selectSession', async (...args) => {
        if (fail) { fail = false; throw new Error('SELECTION_DISK_FAILED') }
        return select(...args)
    })
    await assert.rejects(sessions.createRoom(20000, 'My'), /SESSION_SELECTION_PENDING/)
    assert.equal(sessions.selectionPending.roomId, 'room')
    const sent = meal.relay.sent
    await sessions.recoverSelection()
    assert.equal(meal.dining.sessionData.roomId, 'room')
    assert.equal(sessions.selectionPending, undefined)
    assert.equal(meal.relay.sent, sent)
})

test('退出房间已提交但清理本地会话失败时，重试只清理会话，不重复提交退出', async t => {
    const meal = await room(t)
    const sessions = SessionStore.create(meal.app, meal.app.queries, meal.app.pinia)
    t.after(() => sessions.$dispose())
    const data = meal.app.resolve(LocalDiningData.token), clear = data.clearSession.bind(data)
    let fail = true
    t.mock.method(data, 'clearSession', async (...args) => {
        if (fail) { fail = false; throw new Error('CLEANUP_DISK_FAILED') }
        return clear(...args)
    })
    await assert.rejects(sessions.leaveRoom(), /CLEANUP_DISK_FAILED/)
    const sent = meal.relay.sent
    assert.equal(meal.dining.sessionData.roomId, 'room')
    await sessions.leaveRoom()
    assert.equal(meal.dining.sessionData, undefined)
    assert.equal(meal.relay.sent, sent)
})

test('服务端房间已销毁时仍可退出本机会话，保留本地历史和身份', async t => {
    const meal = await room(t)
    const sessions = SessionStore.create(meal.app, meal.app.queries, meal.app.pinia)
    t.after(() => sessions.$dispose())
    const identity = meal.dining.identity().id
    t.mock.method(meal.app.runtime, 'run', async () => { throw new Error('REJECTED_404') })
    await sessions.leaveRoom()
    assert.equal(meal.dining.sessionData, undefined)
    assert.equal(meal.dining.identity().id, identity)
})

test('空用餐已放弃但本机会话清理失败，重试退出只清理会话', async t => {
    const meal = await new DiningScenario.Meal().givenRestaurant()
    t.after(meal.app.dispose)
    await meal.givenSingle()
    const sessions = SessionStore.create(meal.app, meal.app.queries, meal.app.pinia)
    t.after(() => sessions.$dispose())
    const data = meal.app.resolve(LocalDiningData.token), clear = data.clearSession.bind(data)
    let fail = true
    t.mock.method(data, 'clearSession', async (...args) => {
        if (fail) { fail = false; throw new Error('CLEANUP_DISK_FAILED') }
        return clear(...args)
    })
    await assert.rejects(sessions.exitMenu(), /CLEANUP_DISK_FAILED/)
    assert.equal(meal.dining.activity().status, 'ABANDONED')
    await sessions.exitMenu()
    assert.equal(meal.dining.session(), undefined)
})

test('已销毁房间退出菜单会清除过期会话', async t => {
    const meal = await room(t)
    const sessions = SessionStore.create(meal.app, meal.app.queries, meal.app.pinia)
    t.after(() => sessions.$dispose())
    t.mock.method(meal.app.runtime, 'run', async () => { throw new Error('REJECTED_404') })
    await sessions.exitMenu()
    assert.equal(meal.dining.session(), undefined)
})
