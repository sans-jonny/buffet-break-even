const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')
const {parse, compileScript, compileTemplate} = require('@vue/compiler-sfc')

// Compile actual SFC scripts and templates with the real application and an isolated Storage adapter.
function pageHarness(options = {}) {
    const cache = new Map(), calls = [], hooks = {}, toasts = []
    const stored = new Map()
    let client
    const navigation = Object.fromEntries(['open', 'back', 'toResult', 'toRecord', 'toCustomMenu', 'toMenuPreview', 'toOrderSlip']
        .map(method => [method, async (...args) => {
            calls.push([method, ...args])
        }]))
    Object.assign(navigation, options.navigation)
    const platform = {
        getStorageSync: key => stored.get(key),
        setStorageSync: (key, value) => stored.set(key, value),
        removeStorageSync: key => stored.delete(key),
        getWindowInfo: () => ({statusBarHeight: 24, windowWidth: 375}),
        getSystemInfoSync: () => ({statusBarHeight: 24, windowWidth: 375}),
        upx2px: value => value / 2,
        showToast: options => toasts.push(options.title)
    }
    const sourceRoot = path.resolve(__dirname, '../../src')

    function load(filename, template = false) {
        if (!path.extname(filename)) filename += '.ts'
        if (cache.has(filename)) return cache.get(filename).exports
        const module = {exports: {}}
        cache.set(filename, module)
        let source = fs.readFileSync(filename, 'utf8')
        let renderSource
        if (filename.endsWith('.vue')) {
            const {descriptor, errors} = parse(source, {filename})
            if (errors.length) throw errors[0]
            const script = compileScript(descriptor, {id: filename})
            source = script.content
            if (template) {
                const compiled = compileTemplate({
                    source: descriptor.template.content, filename, id: filename,
                    ssr: true, ssrCssVars: [], compilerOptions: {
                        bindingMetadata: script.bindings,
                        isCustomElement: tag => ['view', 'text', 'scroll-view', 'picker', 'image', 'canvas', 'navigator'].includes(tag)
                    }
                })
                if (compiled.errors.length) throw compiled.errors[0]
                renderSource = compiled.code
            }
        }

        function requireModule(name) {
            if (name === 'vue') return {
                ...vue,
                inject: token => token.description === 'DiningClient' ? getClient() : token.description === 'BuffetNavigation' ? navigation : vue.inject(token)
            }
            if (name === '@dcloudio/uni-app') return Object.fromEntries(['onLoad', 'onShow', 'onUnload', 'onBackPress']
                .map(name => [name, callback => {
                    (hooks[name] ||= []).push(callback)
                }]))
            if (name.startsWith('@/')) return load(path.join(sourceRoot, name.slice(2)), template)
            if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name), template)
            return require(name)
        }

        function evaluate(code, target) {
            const {outputText} = ts.transpileModule(code, {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES2020
                }
            })
            vm.runInNewContext(outputText, {
                module: target, exports: target.exports, require: requireModule, uni: platform,
                // This loader bypasses Vite; use the same export configured for auto-import.
                useRequired: token => requireModule('@/ui/useRequired').useRequired(token),
                getCurrentPages: () => [], setTimeout, clearTimeout, setInterval, clearInterval, console
            }, {filename})
        }

        evaluate(source, module)
        if (renderSource) {
            const renderModule = {exports: {}}
            evaluate(renderSource, renderModule)
            module.exports.default.ssrRender = renderModule.exports.ssrRender
        }
        return module.exports
    }

    function getClient() {
        if (!client) client = options.client || new (load(path.join(sourceRoot, 'ui/DiningClient.ts')).DiningClient)('http://relay.test')
        return client
    }

    function setup(name, query = {}) {
        const component = load(path.join(sourceRoot, `ui/pages/${name}/index.vue`)).default
        const scope = vue.effectScope()
        const state = scope.run(() => component.setup({}, {
            expose: () => {
            }
        }))
        const ready = getClient().ready.then(async () => {
            for (const callback of hooks.onLoad || []) await callback(query)
        })
        return {
            state, ready, dispose: () => {
                for (const callback of hooks.onUnload || []) callback();
                scope.stop()
            }
        }
    }

    function component(name, props, emit = () => {
    }) {
        const source = load(path.join(sourceRoot, `ui/components/${name}/${name}.vue`)).default
        const scope = vue.effectScope()
        const state = scope.run(() => source.setup(props, {
            expose: () => {
            }, emit
        }))
        return {state, dispose: () => scope.stop()}
    }

    async function render(name, configure) {
        await getClient().ready
        const {renderToString} = require('vue/server-renderer')
        const source = load(path.join(sourceRoot, `ui/pages/${name}/index.vue`), true).default
        const component = {
            ...source, setup(props, context) {
                const state = source.setup(props, context)
                configure?.(state)
                return state
            }
        }
        const app = vue.createSSRApp(component)
        // uni-app normally auto-registers these components through easycom.
        for (const folder of fs.readdirSync(path.join(sourceRoot, 'ui/components'))) {
            const filename = path.join(sourceRoot, `ui/components/${folder}/${folder}.vue`)
            if (fs.existsSync(filename)) app.component(folder, load(filename, true).default)
        }
        const warnings = []
        app.config.warnHandler = message => {
            if (!message.startsWith('Failed to resolve component:')) warnings.push(message)
        }
        const html = await renderToString(app)
        for (const callback of hooks.onUnload || []) callback()
        if (warnings.length) throw new Error(warnings.join('\n'))
        return html
    }

    return {
        setup, component, render, calls, hooks, toasts, get client() {
            return getClient()
        }
    }
}

module.exports = {pageHarness}
