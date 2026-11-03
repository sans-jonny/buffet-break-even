require('../../scripts/typescript.cjs')
const fs = require('node:fs')
const vm = require('node:vm')
const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const vue = require('vue')
const {parse, compileScript} = require('@vue/compiler-sfc')
const {DiningAppLifecycle} = require('../../src/infrastructure/lifecycle/DiningAppLifecycle.ts')
const {ManagedRoomConnection} = require('../../src/infrastructure/event-store/ManagedRoomConnection.ts')

test('App 显式绑定前台恢复与后台停止，setup 不触发房间调用', async () => {
    const {descriptor} = parse(fs.readFileSync('src/ui/App.vue', 'utf8'))
    const script = compileScript(descriptor, {id: 'app-lifecycle'})
    const hooks = {}, calls = []
    const lifecycle = {resume: async () => { calls.push('resume') }, suspend: () => { calls.push('suspend') }, exit: async () => { calls.push('exit') }}
    const module = {exports: {}}
    vm.runInNewContext(ts.transpileModule(script.content, {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}
    }).outputText, {module, exports: module.exports, require: name => {
        if (name === 'vue') return vue
        if (name === '@dcloudio/uni-app') return {
            onShow: work => { hooks.show = work }, onHide: work => { hooks.hide = work }, onExit: work => { hooks.exit = work }
        }
        return {DiningAppLifecycle}
    }})
    const app = vue.createSSRApp({}), scope = vue.effectScope()
    app.provide(DiningAppLifecycle.token, lifecycle)
    try {
        app.runWithContext(() => scope.run(() => module.exports.default.setup({}, {expose: () => {}})))
        assert.deepEqual(calls, [])
        await hooks.show()
        hooks.hide()
        await hooks.show()
        assert.deepEqual(calls, ['resume', 'suspend', 'resume'])
        await hooks.exit()
        assert.deepEqual(calls, ['resume', 'suspend', 'resume', 'exit'])
    } finally { scope.stop() }
})

test('重复前台通知共享恢复；切后台后停止连接，旧订阅迟到不能覆盖新连接', async t => {
    const subscriptions = [], closed = [], errors = []
    let synchronizations = 0, refreshes = 0
    const connection = new ManagedRoomConnection({
        subscribe: () => new Promise(resolve => {
            const index = subscriptions.length
            subscriptions.push(() => resolve(() => closed.push(index)))
        })
    }, {synchronize: async () => { synchronizations++ }}, {}, error => errors.push(error))
    const lifecycle = new DiningAppLifecycle({execute: async () => {
        refreshes++
        await connection.watch('room')
    }}, connection, error => errors.push(error))
    t.after(() => lifecycle.dispose())
    const first = lifecycle.resume()
    assert.equal(lifecycle.resume(), first)
    await Promise.resolve()
    assert.equal(refreshes, 1)
    lifecycle.suspend()
    const second = lifecycle.resume()
    await Promise.resolve()
    subscriptions[1]()
    await second
    subscriptions[0]()
    await first
    assert.deepEqual(closed, [0])
    assert.equal(synchronizations, 1)
    assert.equal(refreshes, 2)
    assert.equal(lifecycle.resume(), second)
    assert.deepEqual(errors, [])
    lifecycle.suspend()
    assert.deepEqual(closed, [0, 1])
})

test('前台同步失败只报告一次，可再次恢复；销毁后不再启动连接', async () => {
    const errors = []
    let calls = 0, stops = 0
    const lifecycle = new DiningAppLifecycle({execute: async () => {
        if (++calls === 1) throw new Error('NETWORK_FAILED')
    }}, {suspend: () => { stops++ }, resume: () => {}}, error => errors.push(error))
    await lifecycle.resume()
    assert.equal(errors.length, 1)
    assert.equal(errors[0].message, 'NETWORK_FAILED')
    await lifecycle.resume()
    assert.equal(calls, 2)
    lifecycle.dispose()
    await lifecycle.resume()
    assert.equal(calls, 2)
    assert.equal(stops, 1)
})

test('前台恢复尚未开始即切后台时，不执行过期的恢复命令', async () => {
    let calls = 0
    const lifecycle = new DiningAppLifecycle({execute: async () => { calls++ }}, {suspend: () => {}, resume: () => {}}, () => {})
    const pending = lifecycle.resume()
    lifecycle.suspend()
    await pending
    assert.equal(calls, 0)
    lifecycle.dispose()
})

test('后台期间延迟完成的创建流程不能重新打开房间连接，返回前台后才允许连接', async t => {
    let subscriptions = 0, closed = 0
    const connection = new ManagedRoomConnection({subscribe: async () => {
        subscriptions++
        return () => { closed++ }
    }}, {synchronize: async () => {}}, {}, () => {})
    t.after(() => connection.stop())
    connection.suspend()
    await assert.rejects(connection.watch('late-room'), /ROOM_CONNECTION_CANCELLED/)
    assert.equal(subscriptions, 0)
    connection.resume()
    await connection.watch('late-room')
    assert.equal(subscriptions, 1)
    connection.suspend()
    assert.equal(closed, 1)
})

test('网络恢复只在前台重新同步；后台和销毁后不启动连接', async () => {
    const {DiningAppLifecycle} = require('../../src/infrastructure/lifecycle/DiningAppLifecycle.ts')
    let refreshes = 0, recovered = 0
    const lifecycle = new DiningAppLifecycle({execute: async () => { refreshes++ }},
        {resume() {}, suspend() {}}, error => { throw error }, async () => { recovered++ })
    await lifecycle.resume()
    lifecycle.networkChanged(false); lifecycle.networkChanged(true)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(refreshes, 2)
    assert.equal(recovered, 2)
    lifecycle.suspend(); lifecycle.networkChanged(false); lifecycle.networkChanged(true)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(refreshes, 2)
    lifecycle.dispose(); lifecycle.networkChanged(false); lifecycle.networkChanged(true)
    assert.equal(refreshes, 2)
})
