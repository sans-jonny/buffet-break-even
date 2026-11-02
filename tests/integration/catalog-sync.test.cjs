require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {DiningScenario} = require('../support/DiningScenario.ts')
const {SessionStore} = require('../../src/stores/business/SessionStore.ts')
const {RoomConnection} = require('../../src/coordination/application/port/out/session/RoomConnection.ts')

async function room(t) {
    const meal = await new DiningScenario.Meal().givenRestaurant()
    t.after(meal.app.dispose)
    await meal.givenRoom()
    return meal
}

test('私人菜单修改只保存本地，重新加入才更新原房间', async t => {
    const meal = await room(t)
    const sent = meal.relay.sent
    const response = await meal.app.catalog.publish(DiningScenario.restaurant({version: 2, name: '更新后的餐厅'}))
    assert.equal(response.value.version, 2)
    assert.equal(meal.relay.sent, sent)
    assert.equal(meal.dining.restaurants()[0].sourceVersion, 1)
    assert.equal(meal.app.catalog.restaurant('buffet').version, 2)
    const restarted = new DiningScenario.Meal(meal.relay, 'restart')
    t.after(restarted.app.dispose)
    for (const [key, value] of meal.storage.values) restarted.storage.values.set(key, value)
    await restarted.initialize()
    assert.equal(meal.relay.sent, sent)
    await restarted.joinRoom('room')
    assert.equal(restarted.app.catalog.restaurant('buffet').version, 2)
    assert.equal(restarted.dining.restaurants()[0].sourceVersion, 2)
    const afterJoin = meal.relay.sent
    assert.equal(meal.relay.sent, afterJoin)
})

test('删除私人菜单不立即删除房间副本，重新加入时才同步删除', async t => {
    const meal = await room(t)
    const sent = meal.relay.sent
    const response = await meal.app.catalog.remove('buffet')
    assert.equal(meal.relay.sent, sent)
    assert.equal(meal.dining.restaurants().length, 1)
    assert.equal(meal.app.catalog.restaurants.length, 0)
    await meal.joinRoom('room')
    assert.equal(meal.app.catalog.restaurant('buffet', true).version, 2)
    assert.deepEqual(meal.dining.restaurants(), [])
})

test('房间目录提交结果未知时不重发；显式核对后识别已提交版本', async t => {
    const meal = await room(t)
    meal.relay.loseResponse = true
    await meal.app.catalog.publish(DiningScenario.restaurant({version: 2}))
    await assert.rejects(meal.joinRoom('room'), /UNKNOWN_COMMIT_OUTCOME/)
    const sent = meal.relay.sent
    await meal.joinRoom('room')
    assert.equal(meal.relay.sent, sent)
    meal.relay.loseResponse = false
    await meal.app.runtime.acknowledgeUnknown('room')
    assert.equal(meal.relay.sent, sent)
})

test('已有点餐记录也会在离房时清除会话并断开连接；离房编辑不写服务端', async t => {
    const meal = await room(t)
    await meal.whenEating(1, 'room:buffet', 'room:buffet:shrimp')
    const stopped = t.mock.method(meal.app.resolve(RoomConnection.token), 'stop', () => {})
    const sessions = SessionStore.create(meal.app, meal.app.queries, meal.app.pinia)
    t.after(() => sessions.$dispose())
    await sessions.exitMenu()
    assert.equal(meal.dining.session(), undefined)
    assert.equal(stopped.mock.callCount(), 1)
    assert.equal(meal.app.collaboration.findRoom('room').members.find(m => m.id === meal.dining.identity().id).present, false)
    const sent = meal.relay.sent
    await meal.givenRestaurant({version: 2, name: '离房后的新菜单'})
    assert.equal(meal.relay.sent, sent)
    await meal.joinRoom('room')
    assert.equal(meal.dining.restaurants()[0].name, '离房后的新菜单')
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
