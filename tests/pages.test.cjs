const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { parse, compileScript } = require('@vue/compiler-sfc')
const vue = require('vue')
const { createPinia, setActivePinia } = require('pinia')
const root = path.resolve(__dirname, '../src')

// 编译真实页面脚本，用平台边界替身验证事件接线；不模拟真实浏览器布局。
function harness() {
  const cache = new Map()
  const services = new Map()
  const hooks = { onLoad: [], onShow: [] }
  const toasts = []
  const navigation = []
  const storage = new Map()
  const platform = {
    getStorageSync: key => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, JSON.parse(JSON.stringify(value))),
    showToast: options => toasts.push(options.title),
    showModal: options => options.success({ confirm: true }),
    getSystemInfoSync: () => ({ statusBarHeight: 0 }), upx2px: value => value
  }
  function load(file) {
    file = path.resolve(root, file)
    if (!path.extname(file)) file += '.ts'
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }
    cache.set(file, module)
    let source = fs.readFileSync(file, 'utf8')
    if (file.endsWith('.vue')) {
      const descriptor = parse(source, { filename: file }).descriptor
      source = compileScript(descriptor, { id: file }).content
    }
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } })
    vm.runInNewContext(outputText, { module, exports: module.exports, uni: platform,
      require(name) {
        if (name === 'vue') return { ...vue, inject: token => services.get(token) }
        if (name === '@dcloudio/uni-app') return { onLoad: callback => hooks.onLoad.push(callback), onShow: callback => hooks.onShow.push(callback) }
        if (name.endsWith('.vue')) return { default: {} }
        if (name.startsWith('@/')) return load(name.slice(2))
        if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name))
        return require(name)
      }
    }, { filename: file })
    return module.exports
  }
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = load('stores/useDiningStore').useDiningStore(pinia)
  load('composition/registerApplication').registerApplication({ provide: (token, service) => services.set(token, service) }, pinia)
  const nav = Object.fromEntries(['open', 'toOrderSlip', 'toResult', 'toRecord', 'back'].map(method => [method, async (...args) => { navigation.push([method, ...args]) }]))
  services.set(load('navigation/BuffetNavigation').BuffetNavigation, nav)
  for (const [ctx, name] of [['dining', 'LoadDining'], ['dining-history', 'LoadHistory'], ['receipt-collection', 'LoadCollection']]) services.get(load('contexts/independent/' + ctx + '/public')[name + 'Input'].Token).execute({})
  return { store, history: load('stores/useHistoryStore').useHistoryStore(pinia), collection: load('stores/useCollectionStore').useCollectionStore(pinia), navigation, toasts, hooks,
    page: file => load(`pages/${file}/index.vue`).default.setup({}, { expose: () => {} }),
    input: name => services.get(load('contexts/' + ({ CompleteDining: 'orchestration/complete-dining', DeleteRecord: 'independent/dining-history', DeleteReceipt: 'independent/receipt-collection', GetMenu: 'independent/catalog' }[name] || 'independent/dining') + '/public')[name + 'Input'].Token) }
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await vue.nextTick() }

test('真实页面事件从开始、菜单加减、提交到结果收藏，展示随 Presenter 更新', async () => {
  const app = harness()
  const setup = app.page('setup')
  setup.ticketInput.value = '20'
  setup.start('单人')
  await flush()
  assert.equal(app.store.view.session.ticketPrice, 20)
  assert.deepEqual(app.navigation[0], ['open', 'menu'])
  const menu = app.page('menu')
  await menu.addItem('beef')
  assert.equal(menu.totalSelectedCount.value, 1)
  assert.equal(menu.displayValue.value, 8)
  await menu.removeItem('beef')
  assert.equal(menu.totalSelectedCount.value, 0)
  await menu.addItem('juice')
  menu.selectCategory('我的最爱')
  assert.equal(menu.filteredProducts.value.some(product => product.id === 'beef'), true)
  menu.openOrderSlip()
  await flush()
  assert.deepEqual(app.navigation.at(-1), ['toOrderSlip'])
  const order = app.page('order-slip')
  order.completeRound()
  await flush()
  assert.equal(app.store.view.session.rounds.length, 1)
  assert.equal(menu.totalSelectedCount.value, 0)
  await menu.addItem('beef')
  const result = app.page('result')
  assert.equal(result.displayReceipt.value.value, 15.5)
  assert.equal(app.store.view.session.rounds.length, 1)
  result.save()
  await flush()
  assert.equal(app.history.view.records[0].rounds.length, 2)
  assert.equal(app.collection.view.receipts[0].value, 15.5)
  assert.deepEqual(app.navigation.at(-1), ['open', 'mine', 'reset'])
})

test('页面无效输入展示错误且不导航；多个结果页的选择状态互不影响', async () => {
  const app = harness()
  const setup = app.page('setup')
  setup.ticketInput.value = '-10'
  setup.start('单人')
  await flush()
  assert.equal(app.navigation.length, 0)
  assert.equal(app.toasts.length, 1)
  assert.equal(setup.starting.value, false)
  app.input('BeginSession').execute({ ticketPrice: 20, diningMode: '单人' })
  app.input('ChangeSelection').execute({ productId: 'beef', change: 1 })
  app.input('CompleteDining').execute({ collectReceipt: true })
  const first = app.page('result')
  const second = app.page('result')
  const receiptId = app.history.view.records[0].id
  first.receiptId.value = receiptId
  assert.equal(first.displayReceipt.value.value, 8)
  assert.equal(second.receiptId.value, '')
  assert.equal(first.isSavedView.value, true)
  const detail = app.page('record-detail')
  detail.recordId.value = receiptId
  detail.confirmDelete()
  await flush()
  assert.equal(app.history.view.records.length, 0)
  assert.equal(app.collection.view.receipts.length, 1)
  assert.equal(detail.receipt.value, undefined)
})
