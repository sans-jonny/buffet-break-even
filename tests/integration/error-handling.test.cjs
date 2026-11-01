const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')
const {loadModule} = require('../helpers/runtime.cjs')
const {pageHarness} = require('../helpers/pages.cjs')

// Mount a real Vue component event chain with the error handler from main.ts.
// An in-memory renderer keeps these tests independent of browser/platform UI.
function application(action) {
    let fire
    const logs = [], toasts = []
    const Emitter = vue.defineComponent({
        emits: ['action'], setup(_, context) {
            fire = () => context.emit('action')
            return () => null
        }
    })
    const Root = {render: () => vue.h(Emitter, {onAction: action})}
    const renderer = vue.createRenderer({
        createComment: text => ({text}), insert: () => {
        }, remove: () => {
        }, parentNode: () => null, nextSibling: () => null
    })
    const platform = {showToast: options => toasts.push(options.title)}
    const module = {exports: {}}
    const source = ts.transpileModule(fs.readFileSync('src/ui/main.ts', 'utf8').replace('import.meta.env.VITE_RELAY_URL', "'http://relay.test'"), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}
    }).outputText
    // UniApp injects a bare createApp() call; an export alias alone does not bind it locally.
    vm.runInNewContext(source + '\nmodule.exports.__boot = createApp;', {
        module, exports: module.exports, Error, uni: platform,
        console: {error: (...args) => logs.push(args)},
        require: name => {
            if (name === 'vue') return {...vue, createSSRApp: () => renderer.createApp(Root)}
            if (name === './App.vue') return {default: {}}
            if (name === './DiningClient') return {
                DiningClient: class {
                    static token = Symbol();
                    ready = Promise.resolve()

                    static report() {
                    };
                }
            }
            return loadModule('ui/' + name.slice(2), platform)
        }
    })
    const {app} = module.exports.__boot()
    app.mount({})
    return {fire, logs, toasts, dispose: () => app.unmount()}
}

const flush = () => new Promise(resolve => setImmediate(resolve))

test('全局入口记录同步异常并提示，非 Error 异常使用默认文案', async t => {
    let failure = new Error('同步操作失败')
    const app = application(() => {
        throw failure
    });
    t.after(app.dispose)
    app.fire();
    await flush()
    assert.deepEqual(app.toasts, ['同步操作失败'])
    assert.equal(app.logs[0][2], failure)
    failure = 'unexpected value'
    app.fire();
    await flush()
    assert.deepEqual(app.toasts, ['同步操作失败', '操作失败，请重试'])
    assert.equal(app.logs.length, 2)
})

test('页面直接返回导航 Promise，拒绝只由全局入口提示一次', async t => {
    const harness = pageHarness({navigation: {back: () => Promise.reject(new Error('页面打开失败，请重试'))}})
    const page = harness.setup('setup');
    t.after(page.dispose)
    const app = application(page.state.goBack);
    t.after(app.dispose)
    app.fire();
    await flush()
    assert.deepEqual(app.toasts, ['页面打开失败，请重试'])
    assert.equal(app.logs.length, 1)
    assert.deepEqual(harness.toasts, [])
})

test('确认弹窗先关闭，再将异步导航错误传给 Vue；重复确认不重复执行', async t => {
    const {useAppDialog} = loadModule('ui/components/app-confirm-dialog/useAppDialog')
    const controller = useAppDialog()
    controller.open({title: '确认操作', content: '测试', success: () => Promise.reject(new Error('返回失败'))})
    const app = application(controller.confirm);
    t.after(app.dispose)
    app.fire()
    assert.equal(controller.dialog.value, null)
    await flush()
    assert.deepEqual(app.toasts, ['返回失败'])
    app.fire();
    await flush()
    assert.equal(app.logs.length, 1)
})

test('确认和取消均返回回调 Promise，关闭按钮不执行回调', async () => {
    const {useAppDialog} = loadModule('ui/components/app-confirm-dialog/useAppDialog')
    for (const response of ['confirm', 'cancel']) {
        const controller = useAppDialog()
        const promise = Promise.resolve()
        let result
        controller.open({
            title: '确认', content: '测试', success: value => {
                assert.equal(controller.dialog.value, null)
                result = value
                return promise
            }
        })
        assert.equal(controller[response](), promise)
        await promise
        assert.equal(result.confirm, response === 'confirm')
        assert.equal(result.cancel, response === 'cancel')
        controller.open({title: '关闭', content: '测试', success: () => assert.fail('关闭不执行回调')})
        controller.close()
    }
})
