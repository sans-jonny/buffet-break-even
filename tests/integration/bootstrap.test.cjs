require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const {createSSRApp} = require('vue')
const {TestBootstrap: Bootstrap} = require('../support/TestBootstrap.ts')
const {loadModule} = require('../helpers/runtime.cjs')

test('Bootstrap 完成前不挂载，完成后使用原参数只挂载一次', async () => {
    const app = createSSRApp({}), mounted = []
    app.mount = (...args) => { mounted.push(args) }
    let finish
    const initialization = new Promise(resolve => { finish = resolve })
    const startup = Bootstrap.start(app, () => initialization)
    app.mount('#app')
    app.mount('#duplicate')
    await Promise.resolve()
    assert.equal(mounted.length, 0)
    finish()
    await startup
    assert.deepEqual(mounted, [['#app']])
    app.mount('#late')
    assert.equal(mounted.length, 1)
})

test('Bootstrap 初始化失败时拒绝启动，不挂载业务页面', async () => {
    const app = createSSRApp({})
    let mounted = false
    app.mount = () => { mounted = true }
    const startup = Bootstrap.start(app, async () => { throw new Error('BOOT_FAILED') })
    app.mount('#app')
    await assert.rejects(startup, /BOOT_FAILED/)
    app.mount('#retry-without-initialization')
    assert.equal(mounted, false)
})

test('设备 Bootstrap 在第一次挂载前完成身份与默认目录初始化', async t => {
    const values = new Map()
    const platform = {
        getStorageSync: key => values.get(key), setStorageSync: (key, value) => values.set(key, value),
        removeStorageSync: key => values.delete(key), getStorageInfoSync: () => ({keys: [...values.keys()]})
    }
    const {TestBootstrap: deviceBootstrap} = loadModule('../tests/support/TestBootstrap', platform)
    const app = createSSRApp({})
    let services, sequence = 0, mounted = false
    app.mount = () => {
        assert.ok(services.dining.identityData.id)
        assert.ok(services.catalog.restaurants.length > 0)
        assert.equal(typeof services.sessionStore.startSingle, 'function')
        mounted = true
    }
    const startup = deviceBootstrap.start(app, async () => {
        services = await deviceBootstrap.device('http://relay.test', () => `boot-${++sequence}`, () => {}, app)
        t.after(services.dispose)
    })
    app.mount('#app')
    assert.equal(mounted, false)
    await startup
    assert.equal(mounted, true)
})

test('设备初始化失败时移除网络监听，初始化网络状态迟到不覆盖新事件', async () => {
    const listeners = new Set()
    let initial, writes = 0
    const platform = {
        getStorageSync: () => undefined,
        setStorageSync: () => { writes++; throw new Error('BOOT_STORAGE_FAILED') },
        removeStorageSync() {}, getStorageInfoSync: () => ({keys: []}),
        onNetworkStatusChange: callback => listeners.add(callback),
        offNetworkStatusChange: callback => listeners.delete(callback),
        getNetworkType: options => { initial = options.success }
    }
    const {Bootstrap: production} = loadModule('composition/Bootstrap', platform)
    await assert.rejects(production.device('http://relay.test', () => 'boot-id', () => {}, createSSRApp({})), /BOOT_STORAGE_FAILED/)
    assert.ok(writes > 0)
    assert.equal(listeners.size, 0)
    initial({networkType: 'wifi'}) // A delayed initial-state callback after disposal is harmless.
})
