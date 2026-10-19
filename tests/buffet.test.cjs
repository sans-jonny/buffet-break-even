const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// 直接运行项目 TypeScript，避免为纯业务测试增加构建产物或额外依赖。
function loadModule(entry, uni = {}, cache = new Map()) {
  const filename = path.resolve(__dirname, '../src', `${entry}.ts`)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  })
  vm.runInNewContext(outputText, {
    module, exports: module.exports, uni,
    require: (name) => name.startsWith('@/') ? loadModule(name.slice(2), uni, cache) : name.startsWith('.') ? loadModule(path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(filename), name)), uni, cache) : require(name)
  }, { filename })
  return module.exports
}

const core = Object.assign({}, ...[
  'contexts/independent/buffet/domain/session', 'contexts/independent/buffet/domain/selection', 'contexts/independent/buffet/domain/rounds', 'contexts/independent/buffet/domain/receipts',
  'contexts/independent/buffet/domain/break-even', 'contexts/independent/catalog/domain/product-filter'
].map((entry) => loadModule(entry)))
const plain = (value) => JSON.parse(JSON.stringify(value))
const catalog = [
  { id: 'beef', name: '牛肉', category: '肉类', level: '牛牛', price: 10, emoji: '', gradient: '' },
  { id: 'juice', name: '果汁', category: '饮料', level: '大牛', price: 7.5, emoji: '', gradient: '' }
]

test('每次创建会话都隔离待选和轮次，数量减到零即移除', () => {
  const first = core.createDiningSession(100, '多人', 'meal-1')
  const second = core.createSession()
  const selected = core.changeSelection(first.selected, 'beef', 1)
  assert.deepEqual(plain(first.selected), {})
  assert.deepEqual(plain(selected), { beef: 1 })
  assert.deepEqual(plain(core.changeSelection(selected, 'beef', -1)), {})
  assert.deepEqual(plain(core.changeSelection({}, 'missing', -1)), {})
  assert.notEqual(first.rounds, second.rounds)
  assert.equal(first.ticketPrice, 100)
})

test('金额包括小数单价，未知商品不参与结算', () => {
  const lines = core.getSelectedLines(catalog, { beef: 2, juice: 3, missing: 99 })
  assert.equal(core.getRoundValue(lines), 42.5)
  assert.equal(core.getSelectedCount(lines), 5)
})

test('提交轮次清空待选、保留原会话，空轮次不能重复提交', () => {
  const session = { ...core.createDiningSession(100, '单人', 'meal'), selected: { beef: 2 } }
  const next = core.commitSessionRound(session, catalog, '12:00:00')
  assert.deepEqual(plain(session.selected), { beef: 2 })
  assert.equal(session.rounds.length, 0)
  assert.deepEqual(plain(next.selected), {})
  assert.equal(next.rounds[0].value, 20)
  assert.equal(next.rounds[0].time, '12:00:00')
  assert.equal(core.commitSessionRound(next, catalog, '12:01:00'), next)
})

test('预览合并已提交和待选菜品，正式快照与源数据隔离', () => {
  let session = { ...core.createDiningSession(100, '单人', 'meal'), selected: { beef: 2 } }
  session = core.commitSessionRound(session, catalog, '12:00:00')
  const pending = core.getSelectedLines(catalog, { beef: 1, juice: 2 })
  const preview = core.buildReceipt(session, '10/13/26 12:01', pending)
  assert.equal(preview.value, 45)
  assert.deepEqual(plain(preview.lines), [
    { name: '牛肉', count: 3, price: 10 }, { name: '果汁', count: 2, price: 7.5 }
  ])
  assert.equal(preview.rounds.length, 1)
  const saved = core.buildReceipt(session, '10/13/26 12:02')
  saved.rounds[0].lines[0].count = 999
  saved.lines[0].count = 999
  assert.equal(session.rounds[0].lines[0].count, 2)
  assert.equal(core.getCommittedValue(session.rounds), 20)
})

test('历史记录按 ID 更新且不重复，统计包含正负差额', () => {
  const first = core.buildReceipt(core.createDiningSession(20, '单人', 'first'), 'date')
  const second = { ...first, id: 'second', value: 30, rounds: [core.buildRound(core.getSelectedLines(catalog, { beef: 3 }), 'time')], lines: [{ name: '牛肉', count: 3, price: 10 }] }
  const records = core.upsertReceipt([first], second)
  const updated = core.upsertReceipt(records, { ...first, price: 15 })
  assert.deepEqual(updated.map((item) => item.id).join(','), 'second,first')
  assert.equal(records[1].price, 20)
  assert.deepEqual(plain(core.getRecordStats(updated)), { lifetimeDifference: -5, totalRoundsSaved: 1, totalDishesSaved: 3 })
})

test('回本判断覆盖 60%、100%、超额和零票价边界', () => {
  assert.equal(core.calculateBreakEven(59, 100).verdict, 'below')
  assert.equal(core.calculateBreakEven(60, 100).verdict, 'close')
  assert.equal(core.calculateBreakEven(100, 100).isBreakEven, true)
  assert.equal(core.calculateBreakEven(150, 100).percent, 150)
  assert.equal(core.calculateBreakEven(0, 0).percent, 0)
  assert.equal(core.calculateBreakEven(7.5, 10).difference, -2.5)
})

test('分类和等级同时筛选，收藏保留现有固定名单', () => {
  assert.equal(core.filterProducts(catalog, '饮料').length, 1)
  assert.equal(core.filterProducts(catalog, '饮料', ['牛牛']).length, 0)
  assert.equal(core.filterProducts(catalog, '我的最爱')[0].id, 'beef')
})

function createApplication(options = {}) {
  const cache = new Map()
  const load = entry => loadModule(entry, {}, cache)
  const { CachedBuffetRepository } = load('contexts/independent/buffet/adapter/persistence/CachedBuffetRepository')
  const initial = { session: core.createSession(), records: [], receipts: [] }
  let persisted = initial
  const persistence = options.repository || { load: () => persisted, save: snapshot => { persisted = plain(snapshot); app.saved = plain(snapshot) } }
  const repository = new CachedBuffetRepository(persistence)
  const clock = { createId: () => 'meal-1', roundTime: () => '12:34:56', receiptDate: () => '10/19/26 12:35' }
  const gateway = { products: () => catalog, categories: () => ['肉类', '饮料', '我的最爱'], levels: () => ['牛牛', '大牛'] }
  const output = options.output || { present: snapshot => { app.presented = { snapshot, products: catalog,
    preview: core.buildReceipt(snapshot.session, clock.receiptDate(), core.getSelectedLines(catalog, snapshot.session.selected)) } } }
  const app = { repository, load, gateway }
  for (const name of ['LoadBuffet', 'BeginSession', 'ChangeSelection', 'CommitRound', 'CompleteDining', 'DeleteRecord', 'DeleteReceipt']) {
    const Interactor = load(`contexts/independent/${name === 'GetMenu' ? 'catalog' : 'buffet'}/application/interactor/${name}Interactor`)[`${name}Interactor`]
    const dependencies = {
      LoadBuffet: [repository, output],
      BeginSession: [repository, repository, output, clock],
      ChangeSelection: [repository, repository, output, gateway],
      CommitRound: [repository, repository, output, gateway, clock],
      CompleteDining: [repository, repository, output, gateway, clock, clock],
      DeleteRecord: [repository, repository, output],
      DeleteReceipt: [repository, repository, output],
    }
    app[name] = new Interactor(...dependencies[name])
  }
  app.GetMenu = new (load('contexts/independent/catalog/application/interactor/GetMenuInteractor').GetMenuInteractor)(gateway)
  return app
}

test('用例无需 Vue：待选、轮次、预览、结算、收藏和重复提交', () => {
  const app = createApplication()
  assert.equal(app.CompleteDining.execute({ collectReceipt: true }).completed, false)
  app.BeginSession.execute({ ticketPrice: 20, diningMode: '单人' })
  app.ChangeSelection.execute({ productId: 'beef', change: 1 })
  assert.deepEqual(plain(app.CommitRound.execute({})), { committed: true, roundCount: 1 })
  assert.equal(app.CommitRound.execute({}).committed, false)
  app.ChangeSelection.execute({ productId: 'juice', change: 1 })
  assert.equal(app.presented.preview.value, 17.5)
  assert.equal(app.repository.load().session.rounds.length, 1)
  const result = app.CompleteDining.execute({ collectReceipt: true })
  assert.deepEqual(plain(result), { completed: true, receiptId: 'meal-1' })
  assert.equal(app.saved.records[0].rounds.length, 2)
  assert.equal(app.saved.records[0].date, '10/19/26 12:35')
  assert.equal(app.saved.records[0].rounds[1].time, '12:34:56')
  assert.deepEqual(app.saved.records, app.saved.receipts)
  assert.equal(app.saved.session.active, false)
  assert.equal(app.CompleteDining.execute({ collectReceipt: true }).completed, false)
})

test('非法价格、数量、未知商品和未开始的操作不会写入状态', () => {
  const app = createApplication()
  for (const price of [NaN, Infinity, -1, 0, 0.001]) {
    assert.throws(() => app.BeginSession.execute({ ticketPrice: price, diningMode: '单人' }))
  }
  assert.throws(() => app.ChangeSelection.execute({ productId: 'beef', change: 1 }))
  app.BeginSession.execute({ ticketPrice: 20, diningMode: '单人' })
  const before = plain(app.repository.load())
  assert.throws(() => app.BeginSession.execute({ ticketPrice: 50, diningMode: '多人' }))
  assert.throws(() => app.ChangeSelection.execute({ productId: 'unknown', change: 1 }))
  assert.throws(() => app.ChangeSelection.execute({ productId: 'beef', change: 2 }))
  assert.deepEqual(plain(app.repository.load()), before)
})

test('持久化失败保留待选与展示状态，可安全重试结算', () => {
  let fail = false
  let persisted = { session: core.createSession(), records: [], receipts: [] }
  const app = createApplication({ repository: {
    load: () => persisted,
    save: snapshot => { if (fail) throw Error('disk full'); persisted = plain(snapshot) }
  } })
  app.BeginSession.execute({ ticketPrice: 20, diningMode: '单人' })
  app.ChangeSelection.execute({ productId: 'beef', change: 1 })
  const before = plain(app.repository.load())
  const viewBefore = app.presented
  fail = true
  assert.throws(() => app.CompleteDining.execute({ collectReceipt: true }), /disk full/)
  assert.deepEqual(plain(app.repository.load()), before)
  assert.equal(app.presented, viewBefore)
  assert.equal(persisted.records.length, 0)
  fail = false
  app.CompleteDining.execute({ collectReceipt: true })
  assert.equal(persisted.records.length, 1)
  assert.equal(persisted.records[0].lines[0].count, 1)
})

test('独立业务实例隔离，快照与输出端口修改不能改变业务源数据', () => {
  const first = createApplication()
  const second = createApplication()
  first.BeginSession.execute({ ticketPrice: 20, diningMode: '多人' })
  first.ChangeSelection.execute({ productId: 'beef', change: 1 })
  first.presented.snapshot.session.selected.beef = 999
  first.repository.load().session.selected.beef = 888
  assert.equal(first.repository.load().session.selected.beef, 1)
  assert.equal(second.repository.load().session.active, false)
})

test('记录与收藏按 ID 独立删除，不收藏也保存历史统计', () => {
  const app = createApplication()
  app.BeginSession.execute({ ticketPrice: 20, diningMode: '单人' })
  app.ChangeSelection.execute({ productId: 'beef', change: 1 })
  app.CompleteDining.execute({ collectReceipt: true })
  app.DeleteRecord.execute({ recordId: 'missing' })
  assert.equal(app.saved.records.length, 1)
  app.DeleteRecord.execute({ recordId: 'meal-1' })
  assert.equal(app.saved.records.length, 0)
  assert.equal(app.saved.receipts.length, 1)
  app.DeleteReceipt.execute({ receiptId: 'meal-1' })
  assert.equal(app.saved.receipts.length, 0)
  app.BeginSession.execute({ ticketPrice: 20, diningMode: '单人' })
  app.ChangeSelection.execute({ productId: 'juice', change: 1 })
  app.CompleteDining.execute({ collectReceipt: false })
  assert.equal(app.saved.records.length, 1)
  assert.equal(app.saved.receipts.length, 0)
  assert.equal(core.getRecordStats(app.saved.records).lifetimeDifference, -12.5)
})

test('GetMenu 专属 Response 显式映射，不暴露 Domain 引用或展示字段', () => {
  const app = createApplication()
  const response = app.GetMenu.execute({ category: '饮料', levels: ['大牛'] })
  assert.equal(response.products.length, 1)
  assert.deepEqual(Object.keys(response.products[0]).sort(), ['category', 'id', 'level', 'name', 'price'])
  response.products[0].price = 999
  response.categories.push('fake')
  assert.equal(catalog[1].price, 7.5)
  assert.equal(app.GetMenu.execute({ category: '饮料', levels: ['牛牛'] }).products.length, 0)
})

test('按分汇总避免小数误差，回本边界稳定', () => {
  const lines = [{ product: { ...catalog[0], price: 0.1 }, count: 3 }]
  assert.equal(core.getRoundValue(lines), 0.3)
  assert.equal(core.calculateBreakEven(0.3, 0.3).difference, 0)
  assert.equal(core.calculateBreakEven(0.3, 0.3).isBreakEven, true)
})

test('Presenter 映射 Pinia 展示状态，订阅响应式更新，金额与明细隔离', async () => {
  const { createPinia } = require('pinia')
  const { watch, nextTick } = require('vue')
  const cache = new Map()
  const load = entry => loadModule(entry, {}, cache)
  const store = load('stores/useBuffetViewStore').useBuffetViewStore(createPinia())
  const Presenter = load('contexts/independent/buffet/adapter/presenter/BuffetPresenter').BuffetPresenter
  const presenter = new Presenter(store, () => ({ emoji: '🥩', gradient: 'test-gradient' }), { products: () => catalog }, { receiptDate: () => 'date' })
  const app = createApplication({ output: presenter })
  const seen = []
  const stop = watch(() => store.view.displayValue, value => seen.push(value))
  app.BeginSession.execute({ ticketPrice: 20, diningMode: '单人' })
  app.ChangeSelection.execute({ productId: 'beef', change: 1 })
  await nextTick()
  assert.deepEqual(seen, [10])
  assert.equal(store.view.breakEven.percent, 50)
  assert.equal(store.view.selectedLines[0].product.emoji, '🥩')
  assert.equal(store.view.previewReceipt.dishCount, 1)
  app.CompleteDining.execute({ collectReceipt: true })
  assert.equal(store.view.records[0].result.difference, -10)
  assert.equal(store.view.lifetimeDifference, -10)
  assert.equal(store.view.totalRoundsSaved, 1)
  assert.equal(store.view.session.active, false)
  stop()
})

test('存储网关兼容旧键、缺失记录从小票初始化，完整快照单次写入', () => {
  const Gateway = loadModule('contexts/independent/buffet/adapter/persistence/UniBuffetGateway').UniBuffetGateway
  const old = plain(core.buildReceipt(core.createDiningSession(20, '单人', 'old'), 'date'))
  const data = new Map([['buffet-receipts', [old]]])
  let writes = 0
  const gateway = new Gateway({ getStorageSync: key => data.get(key), setStorageSync: (key, value) => { writes++; data.set(key, plain(value)) } })
  const snapshot = gateway.load()
  assert.equal(snapshot.records[0].id, 'old')
  snapshot.records = []
  gateway.save(snapshot)
  assert.equal(writes, 1)
  assert.equal(gateway.load().records.length, 0)
  assert.equal(gateway.load().receipts.length, 1)
  assert.equal(data.get('buffet-receipts')[0].id, 'old')
  snapshot.receipts[0].value = 999
  assert.equal(gateway.load().receipts[0].value, 0)
})

test('损坏存储与平台异常明确报错，不静默覆盖历史记录', () => {
  const Gateway = loadModule('contexts/independent/buffet/adapter/persistence/UniBuffetGateway').UniBuffetGateway
  const corrupted = new Gateway({ getStorageSync: () => ({ version: 3, session: {} }), setStorageSync: () => assert.fail('不应写入') })
  assert.throws(() => corrupted.load(), /读取用餐数据失败/)
  const unavailable = new Gateway({ getStorageSync: () => { throw Error('unavailable') }, setStorageSync: () => { throw Error('quota') } })
  assert.throws(() => unavailable.load(), /读取用餐数据失败/)
  assert.throws(() => unavailable.save({ session: core.createSession(), records: [], receipts: [] }), /保存失败/)
})

test('Navigation 统一路径、参数编码、返回降级和错误传播', async () => {
  const Navigation = loadModule('navigation/UniBuffetNavigation').UniBuffetNavigation
  const calls = []
  const platform = Object.fromEntries(['navigateTo', 'redirectTo', 'reLaunch', 'navigateBack'].map(method => [method, options => {
    calls.push([method, options.url]); options.success()
  }]))
  const navigation = new Navigation(platform, () => 1)
  await navigation.open('menu', 'replace')
  await navigation.toResult('a b&c')
  await navigation.toRecord('meal-1')
  await navigation.back('records')
  assert.deepEqual(calls, [['redirectTo', '/pages/menu/index'], ['navigateTo', '/pages/result/index?receiptId=a%20b%26c'],
    ['navigateTo', '/pages/record-detail/index?recordId=meal-1'], ['redirectTo', '/pages/records/index']])
  platform.navigateTo = options => options.fail(Error('failed'))
  await assert.rejects(() => navigation.toOrderSlip(), /页面打开失败/)
})

test('全局组合根注册全部公共 Port.In，应用实例隔离且新实例能恢复已保存快照', () => {
  const { createPinia } = require('pinia')
  const cache = new Map()
  const data = new Map()
  const platform = { getStorageSync: key => data.get(key), setStorageSync: (key, value) => data.set(key, plain(value)) }
  const load = entry => loadModule(entry, platform, cache)
  const { registerApplication } = load('composition/registerApplication')
  const buffet = load('contexts/independent/buffet/public')
  const catalog = load('contexts/independent/catalog/public')
  const navigation = load('navigation/BuffetNavigation')
  function create() {
    const services = new Map()
    const pinia = createPinia()
    registerApplication({ provide: (token, service) => services.set(token, service) }, pinia)
    for (const token of [...Object.values(buffet).map(input => input.Token), ...Object.values(catalog).map(input => input.Token), navigation.BuffetNavigation]) {
      assert.equal(typeof token, 'symbol')
      assert.ok(services.has(token), `${String(token)} must be registered`)
    }
    return { services, store: load('stores/useBuffetViewStore').useBuffetViewStore(pinia),
      execute: (token, request = {}) => services.get(token.Token).execute(request) }
  }
  const first = create()
  const second = create()
  first.execute(buffet.LoadBuffetInput)
  second.execute(buffet.LoadBuffetInput)
  first.execute(buffet.BeginSessionInput, { ticketPrice: 20, diningMode: '单人' })
  first.execute(buffet.ChangeSelectionInput, { productId: 'beef', change: 1 })
  assert.equal(first.store.view.displayValue, 8)
  assert.equal(second.store.view.session.active, false)
  assert.notEqual(first.services.get(buffet.BeginSessionInput.Token), second.services.get(buffet.BeginSessionInput.Token))
  const response = first.execute(catalog.GetMenuInput, { category: '我的最爱', levels: [] })
  response.products[0].price = 999
  assert.equal(first.store.view.displayValue, 8)
  first.execute(buffet.CompleteDiningInput, { collectReceipt: true })
  const restored = create()
  restored.execute(buffet.LoadBuffetInput)
  assert.equal(restored.store.view.records[0].value, 8)
  assert.equal(restored.store.view.receipts[0].id, first.store.view.receipts[0].id)
  assert.equal(restored.store.view.session.active, false)
})

test('Input.Request / Response 是可构造的内部类，Input.Token 继续使用 Symbol 注入', () => {
  const cache = new Map()
  const buffet = loadModule('contexts/independent/buffet/public', {}, cache)
  const menu = loadModule('contexts/independent/catalog/public', {}, cache)
  for (const input of [...Object.values(buffet), ...Object.values(menu)]) {
    assert.equal(typeof input.Token, 'symbol')
    assert.equal(typeof input.Request, 'function')
  }
  const app = createApplication()
  app.BeginSession.execute(new buffet.BeginSessionInput.Request(20, '单人'))
  app.ChangeSelection.execute(new buffet.ChangeSelectionInput.Request('beef', 1))
  const ownBuffet = app.load('contexts/independent/buffet/public')
  const ownMenu = app.load('contexts/independent/catalog/public')
  const committed = app.CommitRound.execute(new buffet.CommitRoundInput.Request())
  assert.equal(committed.committed, true)
  assert.ok(committed instanceof ownBuffet.CommitRoundInput.Response)
  const completed = app.CompleteDining.execute(new buffet.CompleteDiningInput.Request(true))
  assert.equal(completed.completed, true)
  assert.ok(completed instanceof ownBuffet.CompleteDiningInput.Response)
  assert.ok(app.CompleteDining.execute(new buffet.CompleteDiningInput.Request(false)) instanceof ownBuffet.CompleteDiningInput.Response)
  app.DeleteRecord.execute(new buffet.DeleteRecordInput.Request('meal-1'))
  app.DeleteReceipt.execute(new buffet.DeleteReceiptInput.Request('meal-1'))
  app.LoadBuffet.execute(new buffet.LoadBuffetInput.Request())
  assert.equal(app.presented.snapshot.records.length, 0)
  assert.equal(app.presented.snapshot.receipts.length, 0)
  const response = app.GetMenu.execute(new menu.GetMenuInput.Request('饮料', ['大牛']))
  assert.equal(response.products.length, 1)
  assert.ok(response instanceof ownMenu.GetMenuInput.Response)
})

test('删除用例仅需读、写、输出三个单方法端口；读取用例无需写端口', () => {
  const app = createApplication()
  const snapshot = { session: core.createSession(), records: [{ id: 'remove' }], receipts: [{ id: 'keep' }] }
  const calls = []
  let saved
  const reader = { load: () => { calls.push('load'); return snapshot } }
  const writer = { save: value => { calls.push('save'); saved = value } }
  const output = { present: value => { calls.push('present'); assert.equal(value, saved || snapshot) } }
  const DeleteRecord = app.load('contexts/independent/buffet/application/interactor/DeleteRecordInteractor').DeleteRecordInteractor
  new DeleteRecord(reader, writer, output).execute({ recordId: 'remove' })
  assert.deepEqual(calls, ['load', 'save', 'present'])
  assert.equal(saved.records.length, 0)
  assert.equal(saved.receipts[0].id, 'keep')
  calls.length = 0
  saved = undefined
  const Load = app.load('contexts/independent/buffet/application/interactor/LoadBuffetInteractor').LoadBuffetInteractor
  new Load(reader, output).execute({})
  assert.deepEqual(calls, ['load', 'present'])
  calls.length = 0
  assert.throws(() => new DeleteRecord(reader, { save: () => { throw Error('failed') } }, output).execute({ recordId: 'remove' }), /failed/)
  assert.deepEqual(calls, ['load'])
})
