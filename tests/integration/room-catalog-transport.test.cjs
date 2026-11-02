require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {loadModule} = require('../helpers/runtime.cjs')
const {ManagedRoomConnection} = require('../../src/infrastructure/event-store/ManagedRoomConnection.ts')

test('图片从菜单信封接收，空闲轮询和加菜通知不会请求图片清单或菜单', async t => {
    t.mock.timers.enable({apis: ['setInterval']})
    const requests = [], catalogs = [], errors = []
    const catalog = {restaurants: [], images: [{restaurantId: 'r', productId: 'p', url: '/rooms/room/image.webp'}]}
    let receive
    const {UniRoomRelay} = loadModule('infrastructure/event-store/UniRoomRelay', {
        request: options => {
            requests.push(options.url)
            options.success({statusCode: 200, data: options.url.endsWith('/catalog') ? catalog : {batches: [], latestVersion: 0, hasMore: false}})
        },
        connectSocket: () => ({
            onMessage: handler => {
                receive = data => handler({data: JSON.stringify(data)})
                queueMicrotask(() => receive({type: 'subscribed', roomId: 'room', catalog, heartbeat: {intervalMs: 10000, timeoutMs: 30000}}))
            }, onError: () => {}, onClose: () => {}, close: () => {}
        })
    })
    const relay = new UniRoomRelay.Client('http://relay', (roomId, data) => catalogs.push({roomId, data}))
    const connection = new ManagedRoomConnection(relay, {synchronize: () => relay.read('room', 0)},
        {projectCommitted: async () => {}}, error => errors.push(error))
    t.after(() => connection.stop())
    await connection.watch('room')
    t.mock.timers.tick(15000)
    receive({type: 'roomBatchesCommitted', roomId: 'room', batch: {events: [{type: 'FoodAdded'}]}})
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(requests.filter(url => url.includes('/events?')).length, 4)
    assert.equal(requests.some(url => /product-images|\/catalog$/.test(url)), false)
    assert.equal(catalogs.length, 1)
    receive({type: 'roomCatalogUpdated', roomId: 'room', catalog: {...catalog, images: []}})
    assert.equal(catalogs.length, 2)
    const records = await relay.readRestaurants('room')
    assert.equal(records.length, 0)
    assert.equal(requests.filter(url => url.endsWith('/catalog')).length, 1)
    assert.deepEqual(errors, [])
})
