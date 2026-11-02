require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {DiningScenario} = require('../support/DiningScenario.ts')

async function room(t) {
    const meal = await new DiningScenario.Meal().givenRestaurant()
    t.after(meal.app.dispose)
    await meal.givenRoom()
    return meal
}

test('目录已存本地但房间拒绝时返回部分完成；重启后找回待同步项，仅补发房间版本', async t => {
    const meal = await room(t)
    meal.relay.beforeAppend = async () => { throw new Error('REJECTED_503') }
    const response = await meal.app.catalog.publish(DiningScenario.restaurant({version: 2, name: '更新后的餐厅'}))
    assert.equal(response.value.localCommitted, true)
    assert.deepEqual(response.value.pendingRooms, [{roomId: 'room', code: 'REJECTED_503'}])
    assert.equal(meal.app.catalog.restaurant('buffet').version, 2)
    assert.equal(meal.app.catalog.pendingSyncData.length, 1)
    const restarted = new DiningScenario.Meal(meal.relay, 'restart')
    t.after(restarted.app.dispose)
    for (const [key, value] of meal.storage.values) restarted.storage.values.set(key, value)
    await restarted.initialize()
    assert.equal(restarted.app.catalog.pendingSyncData[0].restaurantId, 'buffet')
    const retry = await restarted.app.catalog.retrySync('buffet')
    assert.deepEqual(retry.value.pendingRooms, [])
    assert.equal(restarted.app.catalog.restaurant('buffet').version, 2)
    assert.equal(restarted.dining.restaurants()[0].sourceVersion, 2)
    assert.equal(restarted.app.catalog.pendingSyncData.length, 0)
    const sent = meal.relay.sent
    await restarted.app.catalog.retrySync('buffet')
    assert.equal(meal.relay.sent, sent)
})

test('删除原件后的同步失败仍可恢复，待同步查询包含已删除原件', async t => {
    const meal = await room(t)
    meal.relay.beforeAppend = async () => { throw new Error('REJECTED_503') }
    const response = await meal.app.catalog.remove('buffet')
    assert.equal(response.value.pendingRooms.length, 1)
    assert.equal(meal.app.catalog.restaurants.length, 0)
    assert.equal(meal.app.catalog.pendingSyncData.length, 1)
    await meal.app.catalog.retrySync('buffet')
    assert.equal(meal.app.catalog.restaurant('buffet', true).version, 2)
    assert.equal(meal.app.catalog.pendingSyncData.length, 0)
    assert.deepEqual(meal.dining.restaurants(), [])
})

test('房间目录提交结果未知时不重发；显式核对后识别已提交版本', async t => {
    const meal = await room(t)
    meal.relay.loseResponse = true
    const response = await meal.app.catalog.publish(DiningScenario.restaurant({version: 2}))
    assert.equal(response.value.pendingRooms[0].code, 'UNKNOWN_COMMIT_OUTCOME')
    const sent = meal.relay.sent
    const retry = await meal.app.catalog.retrySync('buffet')
    assert.equal(retry.value.pendingRooms[0].code, 'UNKNOWN_COMMIT_OUTCOME')
    assert.equal(meal.relay.sent, sent)
    meal.relay.loseResponse = false
    await meal.app.runtime.acknowledgeUnknown('room')
    assert.equal(meal.app.catalog.pendingSyncData.length, 0)
    await meal.app.catalog.retrySync('buffet')
    assert.equal(meal.relay.sent, sent)
})

test('本地保存失败仍拒绝整个命令，且不尝试房间同步', async t => {
    const meal = await room(t)
    const sent = meal.relay.sent
    meal.storage.fail = () => true
    await assert.rejects(meal.app.catalog.publish(DiningScenario.restaurant({version: 2})), /DISK_FULL/)
    meal.storage.fail = undefined
    assert.equal(meal.app.catalog.restaurant('buffet').version, 1)
    assert.equal(meal.relay.sent, sent)
})

test('首次历史回放补齐私人目录时，即使批次没有目录事件也刷新已缓存的房间菜单', async t => {
    const host = await room(t)
    const guest = new DiningScenario.Meal(host.relay, 'guest')
    t.after(guest.app.dispose)
    await guest.initialize()
    assert.deepEqual(guest.app.queries.restaurants('room'), [])
    await guest.joinRoom('room')
    assert.equal(guest.app.queries.restaurants('room')[0].id, 'room:buffet')
})
