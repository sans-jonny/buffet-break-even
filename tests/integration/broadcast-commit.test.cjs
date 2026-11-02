require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {DiningScenario} = require('../support/DiningScenario.ts')
const {EventBatch} = require('../../protocol/EventBatch.ts')

const flush = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => {
    let resolve, reject
    const promise = new Promise((yes, no) => { resolve = yes; reject = no })
    return {promise, resolve, reject}
}

async function fixture(t) {
    const meal = await new DiningScenario.Meal().givenRestaurant()
    t.after(meal.app.dispose)
    await meal.givenRoom()
    const sent = deferred(), reply = deferred()
    let batch, notifications = 0
    t.after(meal.app.runtime.subscribe(() => { notifications++ }))
    t.mock.method(meal.relay, 'append', async candidate => {
        meal.relay.sent++
        batch = EventBatch.commit(candidate, 'controlled-batch')
        meal.relay.streams.get('room').push(batch)
        sent.resolve(batch)
        return reply.promise
    })
    return {meal, sent, reply, notifications: () => notifications}
}

test('发送及 HTTP 成功均不持久化、不失效、不推进版本；只由广播回放一次', async t => {
    const {meal, sent, reply, notifications} = await fixture(t)
    const beforeHead = meal.storage.get('app:head'), beforeCursor = meal.app.runtime.get('cursor/room')
    let completed = false
    const operation = meal.whenEating(1, 'room:buffet', 'room:buffet:shrimp').then(() => { completed = true })
    const batch = await sent.promise
    assert.equal(meal.storage.get('app:head'), beforeHead)
    reply.resolve(batch)
    await flush()
    assert.equal(completed, false)
    assert.equal(meal.storage.get('app:head'), beforeHead)
    assert.equal(meal.app.runtime.get('cursor/room'), beforeCursor)
    assert.equal(notifications(), 0)
    meal.thenQuantityIs(0, 'room:buffet', 'room:buffet:shrimp')
    await meal.app.runtime.projectCommitted(batch)
    await operation
    meal.thenQuantityIs(1, 'room:buffet', 'room:buffet:shrimp')
    assert.equal(meal.app.runtime.get('cursor/room'), batch.toVersion)
    assert.equal(notifications(), 1)
    const confirmedHead = meal.storage.get('app:head')
    await meal.app.runtime.projectCommitted(batch)
    assert.equal(meal.storage.get('app:head'), confirmedHead)
    assert.equal(notifications(), 1)
})

test('广播先于 HTTP 响应也立即持久化，响应丢失不否定已收到的广播', {timeout: 2000}, async t => {
    const {meal, sent, reply, notifications} = await fixture(t)
    const operation = meal.whenEating(1, 'room:buffet', 'room:buffet:shrimp')
    const batch = await sent.promise
    await meal.app.runtime.projectCommitted(batch)
    meal.thenQuantityIs(1, 'room:buffet', 'room:buffet:shrimp')
    assert.equal(notifications(), 1)
    reply.reject(new Error('NETWORK_TIMEOUT'))
    await operation
    assert.equal(meal.app.runtime.get('outcome/room'), undefined)
    assert.equal(meal.app.runtime.sync.get('room'), 'READY')
    assert.equal(notifications(), 1)
})

test('广播缺失时只接收历史事件补齐，不重发原请求、不采用 HTTP 响应投影', async t => {
    const {meal, sent, reply, notifications} = await fixture(t)
    const beforeHead = meal.storage.get('app:head'), beforeSent = meal.relay.sent
    const operation = meal.whenEating(1, 'room:buffet', 'room:buffet:shrimp')
    const batch = await sent.promise
    // Even a mutated response payload must never become the local business projection.
    const response = JSON.parse(JSON.stringify(batch))
    response.events.find(event => event.type === 'ProductQuantityIncreased').payload.facts.quantity = 99
    reply.resolve(response)
    await flush()
    assert.equal(meal.storage.get('app:head'), beforeHead)
    await operation // Confirmation timeout receives the authoritative stream through read().
    meal.thenQuantityIs(1, 'room:buffet', 'room:buffet:shrimp')
    assert.equal(meal.relay.sent, beforeSent + 1)
    assert.equal(notifications(), 1)
})

test('真实 SQLite/HTTP/WebSocket：创建、加入、两端并发加菜和提交轮次保持一致', {timeout: 10000}, async t => {
    const {RelaySpec} = require('../event-store/RelaySpec.ts')
    const {RelayServer} = require('../../server/src/transport/RelayServer.ts')
    const {Bootstrap} = require('../../src/composition/Bootstrap.ts')
    const {ManagedRoomConnection} = require('../../src/infrastructure/event-store/ManagedRoomConnection.ts')
    const {RoomConnection} = require('../../src/coordination/application/port/out/session/RoomConnection.ts')
    const {RoomGateway} = require('../../src/coordination/application/port/out/session/RoomGateway.ts')
    const {InitializeDiningUseCase} = require('../../src/coordination/application/port/in/initialization/InitializeDiningUseCase.ts')
    const {SessionStore} = require('../../src/stores/business/SessionStore.ts')
    const {loadModule} = require('../helpers/runtime.cjs')
    const database = await RelaySpec.database(), server = await RelayServer.create(database.db)
    const devices = [], failures = [], statuses = []
    let concurrent = false
    const pendingAppends = []
    t.after(async () => {
        for (const device of devices) { device.connection.stop(); device.sessions.$dispose(); device.app.dispose() }
        await server.close()
        await database.dispose()
    })
    async function device(name) {
        let sequence = 0
        const id = () => `${name}-${++sequence}`
        const {UniRoomRelay} = loadModule('infrastructure/event-store/UniRoomRelay', {
            request: options => {
                const send = () => { void server.inject({method: options.method || 'GET', url: options.url.replace('http://relay', ''), payload: options.data})
                    .then(response => {
                        statuses.push(response.statusCode)
                        options.success({statusCode: response.statusCode, data: response.body ? response.json() : undefined})
                    }).catch(options.fail) }
                if (concurrent && options.method === 'POST' && options.url.endsWith('/events')) {
                    pendingAppends.push(send)
                    if (pendingAppends.length === 2) {
                        concurrent = false
                        pendingAppends.splice(0).forEach(work => work())
                    }
                } else send()
            },
            connectSocket: options => {
                const handlers = {}
                let socket, closed = false
                void server.injectWS(options.url.replace('ws://relay', ''), {}, {onInit: ws => {
                    socket = ws
                    if (closed) return ws.terminate()
                    ws.on('message', data => handlers.message?.({data: String(data)}))
                    ws.on('error', error => handlers.error?.(error))
                    ws.on('close', () => handlers.close?.())
                }}).catch(error => handlers.error?.(error))
                return {onMessage: handler => { handlers.message = handler }, onError: handler => { handlers.error = handler },
                    send: options => socket.send(options.data),
                    onClose: handler => { handlers.close = handler }, close: () => { closed = true; socket?.terminate() }}
            }
        })
        const relay = new UniRoomRelay.Client('http://relay')
        const app = Bootstrap.create({storage: new DiningScenario.Storage(), id, now: () => new Date().toISOString(), remote: relay,
            confirmationTimeoutMs: 100})
        DiningScenario.configureSessions(app, id)
        const connection = new ManagedRoomConnection(relay, app.runtime, app.runtime, error => failures.push(error.message))
        app.provide(RoomConnection.token, connection)
        app.provide(RoomGateway.token, relay)
        require('../../src/coordination/composition/CoordinationComposition.ts').CoordinationComposition.registerSessions(app, id)
        const sessions = SessionStore.create(app, app.queries, app.pinia)
        const result = {app, connection, sessions}
        devices.push(result)
        await app.resolve(InitializeDiningUseCase.token).execute(new InitializeDiningUseCase.Request())
        await app.catalog.publish(DiningScenario.restaurant())
        return result
    }
    const host = await device('host'), guest = await device('guest')
    await host.sessions.createRoom(20000, 'My')
    const roomId = host.app.dining.session().roomId, restaurantId = `${roomId}:buffet`, productId = `${restaurantId}:shrimp`
    await guest.sessions.joinRoom(host.app.dining.room().code)
    concurrent = true
    await Promise.all([host.app.dining.edit(restaurantId, 'add', productId), guest.app.dining.edit(restaurantId, 'add', productId)])
    await Promise.all(devices.map(device => device.app.runtime.synchronize(roomId)))
    for (const device of devices) assert.equal(device.app.dining.consumption(restaurantId).rounds[0].items[productId], 2)
    await host.app.dining.submit(restaurantId)
    await flush()
    await guest.app.runtime.synchronize(roomId)
    for (const prefix of ['catalog/' + roomId + '/', 'collaboration/', 'accounting/'])
        assert.deepEqual(host.app.runtime.entries(prefix), guest.app.runtime.entries(prefix))
    assert.equal(host.app.runtime.get(`cursor/${roomId}`), guest.app.runtime.get(`cursor/${roomId}`))
    assert.ok(statuses.includes(409))
    assert.deepEqual(failures, [])
})
