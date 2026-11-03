require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {loadModule} = require('../helpers/runtime.cjs')
const {RelayServer} = require('../../server/src/transport/RelayServer.ts')
const {RelaySpec} = require('../event-store/RelaySpec.ts')

test('旧提交缺少 submissionId 时整批拒绝；旧菜单和图片路由已删除', async t => {
    const database = await RelaySpec.database(), app = await RelayServer.create(database.db)
    t.after(async () => { await app.close(); await database.dispose() })
    const room = (await app.inject({method: 'POST', url: '/rooms'})).json()
    const rejected = await app.inject({method: 'POST', url: `/rooms/${room.roomId}/events`,
        payload: {expectedVersion: 0, events: [RelaySpec.opaque()]}})
    assert.equal(rejected.statusCode, 400)
    assert.equal(rejected.json().error, 'INVALID_SUBMISSION_ID')
    assert.equal((await app.inject({url: `/rooms/${room.roomId}/head`})).json().version, 0)
    assert.equal(await database.db.roomBatch.count(), 0)
    assert.equal(await database.db.roomEvent.count(), 0)
    for (const url of [`/rooms/${room.roomId}/private-restaurants`, `/rooms/${room.roomId}/product-images`,
        '/product-images/p/' + 'a'.repeat(64) + '.webp']) assert.equal((await app.inject({url})).statusCode, 404)
    assert.equal((await app.inject({method: 'POST', url: '/product-images/p/' + 'a'.repeat(64) + '.webp/release', payload: {}})).statusCode, 404)
})

test('菜单接口缺失明确报错，不调用旧接口回退', async () => {
    const requests = []
    const {UniRoomRelay} = loadModule('infrastructure/event-store/UniRoomRelay', {request: options => {
        requests.push(options.url)
        options.success({statusCode: 404, data: {message: 'Route GET:/rooms/r/catalog not found'}})
    }})
    await assert.rejects(new UniRoomRelay.Client('http://relay').readRestaurants('r'), /RELAY_ENDPOINT_UNAVAILABLE/)
    assert.deepEqual(requests, ['http://relay/rooms/r/catalog'])
})

test('订阅缺少当前心跳或菜单信封时拒绝连接，不静默降低协议', async () => {
    for (const fields of [{catalog: {restaurants: [], images: []}}, {heartbeat: {intervalMs: 10000, timeoutMs: 30000}}]) {
        let closed = 0
        const {UniRoomRelay} = loadModule('infrastructure/event-store/UniRoomRelay', {
            request: options => options.success({statusCode: 200, data: {version: 0}}),
            connectSocket: () => ({
                onMessage: receive => queueMicrotask(() => receive({data: JSON.stringify({type: 'subscribed', roomId: 'r', ...fields})})),
                onError: () => {}, onClose: () => {}, close: () => { closed++ }
            })
        })
        await assert.rejects(new UniRoomRelay.Client('http://relay').subscribe('r', () => {}, () => {}), /INVALID_ROOM_PROTOCOL/)
        assert.equal(closed, 1)
    }
})

test('旧餐厅分类和无范围活动不再补值，直接拒绝', () => {
    const {Restaurant} = require('../../src/contexts/catalog/domain/aggregate/Restaurant.ts')
    const {DiningActivity} = require('../../src/contexts/accounting/domain/aggregate/DiningActivity.ts')
    const {DiningScenario} = require('../support/DiningScenario.ts')
    const restaurant = DiningScenario.restaurant()
    delete restaurant.restaurantCategory
    assert.throws(() => Restaurant.reconstitute(restaurant), /INVALID_RESTAURANT_CATEGORY/)
    assert.throws(() => DiningActivity.reconstitute({id: 'a', version: 1, mode: 'SINGLE', status: 'ACTIVE', ticketPriceMinor: 100}), /INVALID_ACTIVITY_RESTAURANTS/)
})
