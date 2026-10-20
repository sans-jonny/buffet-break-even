const assert = require('node:assert/strict')
const test = require('node:test')
const {loadModule} = require('../helpers/runtime.cjs')

const { DiningSession } = loadModule('contexts/dining/session/model/DiningSession')
const { DiningSelection } = loadModule('contexts/dining/session/model/DiningSelection')
const { DiningRound } = loadModule('contexts/dining/session/model/DiningRound')
const { DiningHistory } = loadModule('contexts/dining/history/model/DiningHistory')
const { ReceiptCollection } = loadModule('contexts/dining/collection/model/ReceiptCollection')
const { ProductCatalog } = loadModule('contexts/catalog/model/ProductCatalog')
const { calculateBreakEven } = loadModule('utils/break-even')
const plain = value => JSON.parse(JSON.stringify(value))
const catalog = [
  { id: 'beef', name: '牛肉', category: '肉类', level: '牛牛', price: 10, emoji: '', gradient: '' },
  { id: 'juice', name: '果汁', category: '饮料', level: '大牛', price: 7.5, emoji: '', gradient: '' }
]

test('用户开始用餐并加减菜品，原会话与其他会话保持隔离', () => {
  const first = DiningSession.empty().begin(100, '多人', 'meal-1')
  const second = DiningSession.empty()
  const selected = first.changeSelection('beef', 1, catalog)
  assert.deepEqual(plain(first.selected), {})
  assert.deepEqual(plain(selected.selected), { beef: 1 })
  assert.deepEqual(plain(selected.changeSelection('beef', -1, catalog).selected), {})
  assert.deepEqual(plain(first.changeSelection('beef', -1, catalog).selected), {})
  assert.equal(second.active, false)
  assert.equal(first.ticketPrice, 100)
})

test('用户查看待选金额：小数单价正确，未知商品不参与结算', () => {
  const selection = new DiningSelection({ beef: 2, juice: 3, missing: 99 })
  const lines = selection.resolve(catalog)
  assert.equal(DiningRound.valueOf(lines), 42.5)
  assert.equal(selection.count(catalog), 5)
})

test('用户提交轮次后清空待选，空轮次不能重复提交', () => {
  const session = DiningSession.empty().begin(100, '单人', 'meal').changeSelection('beef', 1, catalog).changeSelection('beef', 1, catalog)
  const next = session.commitRound(catalog, '12:00:00')
  assert.deepEqual(plain(session.selected), { beef: 2 })
  assert.equal(session.rounds.length, 0)
  assert.deepEqual(plain(next.selected), {})
  assert.equal(next.rounds[0].value, 20)
  assert.equal(next.rounds[0].time, '12:00:00')
  assert.equal(next.commitRound(catalog, '12:01:00'), next)
})

test('用户预览合并已提交与待选菜品，结果和会话均隔离外部修改', () => {
  const session = DiningSession.empty().begin(100, '单人', 'meal').changeSelection('beef', 1, catalog).changeSelection('beef', 1, catalog).commitRound(catalog, 'time')
  const pending = session.changeSelection('beef', 1, catalog).changeSelection('juice', 1, catalog).changeSelection('juice', 1, catalog)
  const preview = pending.preview(catalog, 'date')
  assert.equal(preview.value, 45)
  assert.deepEqual(plain(preview.lines), [{ name: '牛肉', count: 3, price: 10 }, { name: '果汁', count: 2, price: 7.5 }])
  assert.equal(preview.rounds.length, 1)
  preview.lines[0].count = 999
  preview.rounds[0].lines[0].count = 999
  const snapshot = session.toSnapshot()
  snapshot.selected.beef = 999
  snapshot.rounds[0].lines[0].count = 999
  assert.equal(session.rounds[0].lines[0].count, 2)
  assert.equal(session.committedValue, 20)
  assert.equal(preview.lines[0].count, 3)
})

test('用户保存与更新历史记录：按 ID 去重，统计包含正负差额', () => {
  const first = DiningSession.empty().begin(20, '单人', 'first').preview(catalog, 'date').toSnapshot()
  const second = { ...first, id: 'second', value: 30, rounds: [DiningRound.create(new DiningSelection({ beef: 3 }).resolve(catalog), 'time').toSnapshot()], lines: [{ name: '牛肉', count: 3, price: 10 }] }
  const records = new DiningHistory([first]).save(second)
  const updated = records.save({ ...first, price: 15 })
  assert.equal(updated.records.map(item => item.id).join(','), 'second,first')
  assert.equal(records.records[1].price, 20)
  assert.deepEqual(plain(updated.statistics), { lifetimeDifference: -5, totalRoundsSaved: 1, totalDishesSaved: 3 })
  const view = updated.records
  view[0].lines[0].count = 999
  assert.equal(updated.records[0].lines[0].count, 3)
})

test('回本判断覆盖 60%、100%、超额和零票价边界', () => {
  assert.equal(calculateBreakEven(59, 100).verdict, 'below')
  assert.equal(calculateBreakEven(60, 100).verdict, 'close')
  assert.equal(calculateBreakEven(100, 100).isBreakEven, true)
  assert.equal(calculateBreakEven(150, 100).percent, 150)
  assert.equal(calculateBreakEven(0, 0).percent, 0)
  assert.equal(calculateBreakEven(7.5, 10).difference, -2.5)
})

test('用户按分类与等级筛选菜品，目录查询不泄露内部引用', () => {
  const menu = new ProductCatalog(catalog)
  assert.equal(menu.filter('饮料').length, 1)
  assert.equal(menu.filter('饮料', ['牛牛']).length, 0)
  assert.equal(menu.filter('我的最爱')[0].id, 'beef')
  menu.filter('饮料')[0].price = 999
  assert.equal(menu.filter('饮料')[0].price, 7.5)
})

test('领域对象独立保护开始、覆盖、选菜与关闭规则，无需通过 Interactor 校验', () => {
  const empty = DiningSession.empty()
  assert.throws(() => empty.changeSelection('beef', 1, catalog), /请先开始用餐/)
  for (const price of [0, -1, NaN, Infinity]) assert.throws(() => empty.begin(price, '单人', 'meal'))
  assert.throws(() => empty.begin(20, 'invalid', 'meal'), /用餐模式无效/)
  assert.throws(() => empty.begin(20, '单人', ''), /用餐编号不能为空/)
  const session = empty.begin(20, '单人', 'meal').changeSelection('beef', 1, catalog)
  assert.throws(() => session.begin(30, '多人', 'next'), /当前用餐尚未结束/)
  assert.throws(() => session.changeSelection('unknown', 1, catalog), /菜品不存在/)
  assert.throws(() => session.changeSelection('beef', 2, catalog), /数量变化无效/)
  assert.throws(() => session.close('wrong'), /当前用餐已变更/)
  const replacement = session.begin(30, '多人', 'next', true)
  assert.deepEqual(plain(replacement.selected), {})
  assert.equal(session.selected.beef, 1)
  assert.equal(session.close('meal').active, false)
  assert.equal(session.active, true)
  const restoredSource = session.toSnapshot()
  const restored = DiningSession.restore(restoredSource)
  restoredSource.selected.beef = 999
  assert.equal(restored.selected.beef, 1)
})

test('用户收藏、更新和移除小票，收藏聚合与输入和读出快照均隔离', () => {
  const receipt = DiningSession.empty().begin(20, '单人', 'meal').changeSelection('beef', 1, catalog)
    .commitRound(catalog, 'time').preview(catalog, 'date').toSnapshot()
  const empty = new ReceiptCollection()
  const collection = empty.collect(receipt)
  receipt.lines[0].count = 999
  receipt.rounds[0].lines[0].count = 999
  assert.equal(empty.receipts.length, 0)
  assert.equal(collection.receipts[0].lines[0].count, 1)
  const returned = collection.receipts
  returned[0].lines[0].count = 888
  assert.equal(collection.receipts[0].lines[0].count, 1)
  const updated = collection.collect({ ...collection.receipts[0], date: 'later' })
  assert.equal(updated.receipts.length, 1)
  assert.equal(updated.receipts[0].date, 'later')
  assert.equal(collection.receipts[0].date, 'date')
  assert.equal(updated.remove('meal').receipts.length, 0)
  assert.equal(updated.receipts.length, 1)
})

function createApplication(options = {}) {
  const cache = new Map()
  const load = entry => loadModule(entry, {}, cache)
  const Database = load('infrastructure/persistence/LocalDiningDatabase').LocalDiningDatabase
  let persisted = { session: DiningSession.empty().toSnapshot(), records: [], receipts: [] }
  const persistence = options.repository || { load: () => persisted, save: snapshot => { persisted = plain(snapshot); app.saved = plain(snapshot) } }
  const database = new Database(persistence)
  const repository = { load: () => ({ session: database.read('session'), records: database.read('records'), receipts: database.read('receipts') }) }
  const dining = new (load('contexts/dining/session/infrastructure/persistence/LocalDiningRepository').LocalDiningRepository)(database)
  const history = new (load('contexts/dining/history/infrastructure/persistence/LocalHistoryRepository').LocalHistoryRepository)(database)
  const collection = new (load('contexts/dining/collection/infrastructure/persistence/LocalCollectionRepository').LocalCollectionRepository)(database)
  const clock = { createId: () => 'meal-1', roundTime: () => '12:34:56', receiptDate: () => '10/19/26 12:35' }
  const gateway = { products: () => catalog, categories: () => ['肉类', '饮料', '我的最爱'], levels: () => ['牛牛', '大牛'] }
  const publish = owner => ({ present: value => {
    database.afterCommit(owner, () => {
      const snapshot = repository.load()
      app.presented = { snapshot, products: catalog,
        preview: DiningSession.restore(snapshot.session).preview(catalog, clock.receiptDate()) }
    })
  } })
  const app = { repository, database, dining, history, collection, clock, load, gateway }
  const outputs = options.outputs || { dining: publish('dining'), history: publish('history'), collection: publish('collection') }
  const create = (context, name, args) => new (load('contexts/' + ({ dining: 'dining/session', 'dining-history': 'dining/history', 'receipt-collection': 'dining/collection' }[context] || context) + '/application/interactor/' + name + 'Interactor')[name + 'Interactor'])(...args)
  app.LoadDining = create('dining', 'LoadDining', [dining, outputs.dining])
  app.BeginSession = create('dining', 'BeginSession', [dining, dining, outputs.dining, clock])
  app.ChangeSelection = create('dining', 'ChangeSelection', [dining, dining, outputs.dining, gateway])
  app.CommitRound = create('dining', 'CommitRound', [dining, dining, outputs.dining, gateway, clock])
  app.PrepareDiningCompletion = create('dining', 'PrepareDiningCompletion', [dining, gateway, clock, clock])
  app.CloseDining = create('dining', 'CloseDining', [dining, dining, outputs.dining])
  app.LoadHistory = create('dining-history', 'LoadHistory', [history, outputs.history])
  app.SaveRecord = create('dining-history', 'SaveRecord', [history, history, outputs.history])
  app.DeleteRecord = create('dining-history', 'DeleteRecord', [history, history, outputs.history])
  app.LoadCollection = create('receipt-collection', 'LoadCollection', [collection, outputs.collection])
  app.CollectReceipt = create('receipt-collection', 'CollectReceipt', [collection, collection, outputs.collection])
  app.DeleteReceipt = create('receipt-collection', 'DeleteReceipt', [collection, collection, outputs.collection])
  app.CompleteDining = new (load('contexts/dining/completion/application/interactor/CompleteDiningInteractor').CompleteDiningInteractor)(
    app.PrepareDiningCompletion, app.SaveRecord, app.CollectReceipt, app.CloseDining,
    new (load('contexts/dining/completion/infrastructure/transaction/LocalCompletionTransaction').LocalCompletionTransaction)(database))
  app.GetMenu = create('catalog', 'GetMenu', [gateway])
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
  let persisted = { session: DiningSession.empty().toSnapshot(), records: [], receipts: [] }
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
  assert.equal(new DiningHistory(app.saved.records).statistics.lifetimeDifference, -12.5)
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
  assert.equal(DiningRound.valueOf(lines), 0.3)
  assert.equal(calculateBreakEven(0.3, 0.3).difference, 0)
  assert.equal(calculateBreakEven(0.3, 0.3).isBreakEven, true)
})

test('三个 Presenter 分别映射 Pinia 状态，业务修改只更新所属展示投影', async () => {
  const { createPinia } = require('pinia')
  const { watch, nextTick } = require('vue')
  const app = createApplication()
  const pinia = createPinia()
  const diningStore = app.load('stores/useDiningStore').useDiningStore(pinia)
  const historyStore = app.load('stores/useHistoryStore').useHistoryStore(pinia)
  const collectionStore = app.load('stores/useCollectionStore').useCollectionStore(pinia)
  const dining = new (app.load('contexts/dining/session/infrastructure/presentation/DiningPresenter').DiningPresenter)(diningStore, () => ({ emoji: '🥩', gradient: 'test' }), app.gateway, app.clock, app.database.afterCommit.bind(app.database))
  const history = new (app.load('contexts/dining/history/infrastructure/presentation/HistoryPresenter').HistoryPresenter)(historyStore, app.database.afterCommit.bind(app.database))
  const collection = new (app.load('contexts/dining/collection/infrastructure/presentation/CollectionPresenter').CollectionPresenter)(collectionStore, app.database.afterCommit.bind(app.database))
  const seen = []
  const stop = watch(() => diningStore.view.displayValue, value => seen.push(value))
  dining.present(DiningSession.empty())
  const oldHistory = historyStore.view
  dining.present(DiningSession.empty().begin(20, '单人', 'meal').changeSelection('beef', 1, catalog))
  await nextTick()
  assert.deepEqual(seen, [10])
  assert.equal(diningStore.view.selectedLines[0].product.emoji, '🥩')
  assert.equal(diningStore.view.breakEven.percent, 50)
  assert.equal(historyStore.view, oldHistory)
  const record = DiningSession.empty().begin(20, '单人', 'meal').changeSelection('beef', 1, catalog).commitRound(catalog, 'time').preview(catalog, 'date').toSnapshot()
  history.present(new DiningHistory([record])); collection.present(new ReceiptCollection([record]))
  assert.equal(historyStore.view.lifetimeDifference, -10)
  assert.equal(historyStore.view.totalRoundsSaved, 1)
  assert.equal(collectionStore.view.receipts[0].value, 10)
  record.lines[0].count = 999
  assert.equal(historyStore.view.records[0].lines[0].count, 1)
  assert.equal(collectionStore.view.receipts[0].lines[0].count, 1)
  stop()
})

test('存储网关兼容旧键、缺失记录从小票初始化，完整快照单次写入', () => {
  const Gateway = loadModule('infrastructure/persistence/storage/UniSnapshotStorage').UniSnapshotStorage
  const old = plain(DiningSession.empty().begin(20, '单人', 'old').preview(catalog, 'date').toSnapshot())
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
  const Gateway = loadModule('infrastructure/persistence/storage/UniSnapshotStorage').UniSnapshotStorage
  const corrupted = new Gateway({ getStorageSync: () => ({ version: 3, session: {} }), setStorageSync: () => assert.fail('不应写入') })
  assert.throws(() => corrupted.load(), /读取用餐数据失败/)
  const unavailable = new Gateway({ getStorageSync: () => { throw Error('unavailable') }, setStorageSync: () => { throw Error('quota') } })
  assert.throws(() => unavailable.load(), /读取用餐数据失败/)
  assert.throws(() => unavailable.save({ session: DiningSession.empty().toSnapshot(), records: [], receipts: [] }), /保存失败/)
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
  const inputs = load('contexts/dining/public')
  const catalog = load('contexts/catalog/public')
  const navigation = load('navigation/BuffetNavigation')
  function create() {
    const services = new Map()
    const pinia = createPinia()
    registerApplication({ provide: (token, service) => services.set(token, service) }, pinia)
    for (const token of [...Object.values(inputs).map(input => input.Token), ...Object.values(catalog).map(input => input.Token), navigation.BuffetNavigation]) {
      assert.equal(typeof token, 'symbol')
      assert.ok(services.has(token), `${String(token)} must be registered`)
    }
    return { services, store: load('stores/useDiningStore').useDiningStore(pinia), history: load('stores/useHistoryStore').useHistoryStore(pinia), collection: load('stores/useCollectionStore').useCollectionStore(pinia),
      execute: (token, request = {}) => services.get(token.Token).execute(request) }
  }
  const first = create()
  const second = create()
  first.execute(inputs.LoadDiningInput)
  second.execute(inputs.LoadDiningInput)
  first.execute(inputs.BeginSessionInput, { ticketPrice: 20, diningMode: '单人' })
  first.execute(inputs.ChangeSelectionInput, { productId: 'beef', change: 1 })
  assert.equal(first.store.view.displayValue, 8)
  assert.equal(second.store.view.session.active, false)
  assert.notEqual(first.services.get(inputs.BeginSessionInput.Token), second.services.get(inputs.BeginSessionInput.Token))
  const response = first.execute(catalog.GetMenuInput, { category: '我的最爱', levels: [] })
  response.products[0].price = 999
  assert.equal(first.store.view.displayValue, 8)
  first.execute(inputs.CompleteDiningInput, { collectReceipt: true })
  const restored = create()
  restored.execute(inputs.LoadDiningInput)
  restored.execute(inputs.LoadHistoryInput)
  restored.execute(inputs.LoadCollectionInput)
  assert.equal(restored.history.view.records[0].value, 8)
  assert.equal(restored.collection.view.receipts[0].id, first.collection.view.receipts[0].id)
  assert.equal(restored.store.view.session.active, false)
})

test('Input.Request / Response 是可构造的内部类，Input.Token 继续使用 Symbol 注入', () => {
  const cache = new Map()
  const inputs = Object.assign({}, ...['dining/session', 'dining/history', 'dining/collection', 'dining/completion'].map(ctx => loadModule('contexts/' + ctx + '/public', {}, cache)))
  const menu = loadModule('contexts/catalog/public', {}, cache)
  for (const input of [...Object.values(inputs), ...Object.values(menu)]) {
    assert.equal(typeof input.Token, 'symbol')
    assert.equal(typeof input.Request, 'function')
  }
  const app = createApplication()
  app.BeginSession.execute(new inputs.BeginSessionInput.Request(20, '单人'))
  app.ChangeSelection.execute(new inputs.ChangeSelectionInput.Request('beef', 1))
  const ownInputs = { ...app.load('contexts/dining/session/public'), ...app.load('contexts/dining/completion/public') }
  const ownMenu = app.load('contexts/catalog/public')
  const committed = app.CommitRound.execute(new inputs.CommitRoundInput.Request())
  assert.equal(committed.committed, true)
  assert.ok(committed instanceof ownInputs.CommitRoundInput.Response)
  const completed = app.CompleteDining.execute(new inputs.CompleteDiningInput.Request(true))
  assert.equal(completed.completed, true)
  assert.ok(completed instanceof ownInputs.CompleteDiningInput.Response)
  assert.ok(app.CompleteDining.execute(new inputs.CompleteDiningInput.Request(false)) instanceof ownInputs.CompleteDiningInput.Response)
  app.DeleteRecord.execute(new inputs.DeleteRecordInput.Request('meal-1'))
  app.DeleteReceipt.execute(new inputs.DeleteReceiptInput.Request('meal-1'))
  app.LoadDining.execute(new inputs.LoadDiningInput.Request())
  assert.equal(app.presented.snapshot.records.length, 0)
  assert.equal(app.presented.snapshot.receipts.length, 0)
  const response = app.GetMenu.execute(new menu.GetMenuInput.Request('饮料', ['大牛']))
  assert.equal(response.products.length, 1)
  assert.ok(response instanceof ownMenu.GetMenuInput.Response)
})

test('删除记录仅需读、写、输出三个端口，加载记录不需要写端口', () => {
  const app = createApplication()
  const calls = []
  let saved
  const record = DiningSession.empty().begin(20, '单人', 'remove').preview(catalog, 'date').toSnapshot()
  const reader = { load: () => { calls.push('load'); return new DiningHistory([record]) } }
  const writer = { save: value => { calls.push('save'); saved = value } }
  const output = { present: value => { calls.push('present'); assert.equal(value, saved) } }
  const Delete = app.load('contexts/dining/history/application/interactor/DeleteRecordInteractor').DeleteRecordInteractor
  new Delete(reader, writer, output).execute({ recordId: 'remove' })
  assert.deepEqual(calls, ['load', 'save', 'present'])
  assert.equal(saved.records.length, 0)
  calls.length = 0
  const Load = app.load('contexts/dining/history/application/interactor/LoadHistoryInteractor').LoadHistoryInteractor
  new Load(reader, { present: value => { calls.push('present'); assert.equal(value.records[0].id, 'remove') } }).execute({})
  assert.deepEqual(calls, ['load', 'present'])
  calls.length = 0
  assert.throws(() => new Delete(reader, { save: () => { throw Error('failed') } }, output).execute({ recordId: 'remove' }), /failed/)
  assert.deepEqual(calls, ['load'])
})

test('准备结束仅返回独立 DTO，不提前提交待选或关闭会话；关闭校验会话 ID', () => {
  const app = createApplication()
  app.BeginSession.execute({ ticketPrice: 20, diningMode: '单人' })
  app.ChangeSelection.execute({ productId: 'beef', change: 1 })
  const before = plain(app.repository.load())
  const view = app.presented
  const prepared = app.PrepareDiningCompletion.execute({})
  assert.equal(prepared.result.rounds.length, 1)
  prepared.result.rounds[0].lines[0].count = 999
  assert.deepEqual(plain(app.repository.load()), before)
  assert.equal(app.presented, view)
  assert.throws(() => app.CloseDining.execute({ sessionId: 'wrong' }), /当前用餐已变更/)
  assert.deepEqual(plain(app.repository.load()), before)
})

test('结束用餐协调调用顺序、可选收藏和 DTO 映射，不直接依赖其他领域对象', () => {
  const app = createApplication()
  const Complete = app.load('contexts/dining/completion/application/interactor/CompleteDiningInteractor').CompleteDiningInteractor
  const result = DiningSession.empty().begin(20, '单人', 'meal').changeSelection('beef', 1, catalog).commitRound(catalog, 'time').preview(catalog, 'date').toSnapshot()
  for (const collectReceipt of [true, false]) {
    const calls = []
    const interactor = new Complete(
      { execute: () => { calls.push('prepare'); return { result } } },
      { execute: request => { calls.push('save'); request.record.lines[0].count = 999 } },
      { execute: request => { calls.push('collect'); assert.equal(request.receipt.lines[0].count, 1) } },
      { execute: request => { calls.push('close'); assert.equal(request.sessionId, 'meal') } },
      { run: work => { calls.push('begin'); const response = work(); calls.push('commit'); return response } },
    )
    assert.equal(interactor.execute({ collectReceipt }).completed, true)
    assert.deepEqual(calls, collectReceipt ? ['begin', 'prepare', 'save', 'collect', 'close', 'commit'] : ['begin', 'prepare', 'save', 'close', 'commit'])
    assert.equal(result.lines[0].count, 1)
  }
})

test('跨领域每个暂存步骤失败都回滚全部切片、缓存与通知，重试只提交一次', () => {
  for (const failingStep of ['save', 'collect', 'close']) {
    let persisted = { session: DiningSession.empty().toSnapshot(), records: [], receipts: [] }
    let writes = 0
    const app = createApplication({ repository: { load: () => persisted, save: value => { writes++; persisted = plain(value) } } })
    app.BeginSession.execute({ ticketPrice: 20, diningMode: '单人' })
    app.ChangeSelection.execute({ productId: 'beef', change: 1 })
    const before = plain(persisted)
    const view = app.presented
    const count = writes
    const step = (name, input) => ({ execute: request => { input.execute(request); if (name === failingStep) throw Error(name) } })
    const Complete = app.load('contexts/dining/completion/application/interactor/CompleteDiningInteractor').CompleteDiningInteractor
    const interactor = new Complete(app.PrepareDiningCompletion, step('save', app.SaveRecord), step('collect', app.CollectReceipt), step('close', app.CloseDining),
      new (app.load('contexts/dining/completion/infrastructure/transaction/LocalCompletionTransaction').LocalCompletionTransaction)(app.database))
    assert.throws(() => interactor.execute({ collectReceipt: true }), new RegExp(failingStep))
    assert.equal(writes, count)
    assert.deepEqual(plain(app.repository.load()), before)
    assert.deepEqual(persisted, before)
    assert.equal(app.presented, view)
    assert.equal(app.CompleteDining.execute({ collectReceipt: true }).completed, true)
    assert.equal(writes, count + 1)
    assert.equal(persisted.records.length, 1)
    assert.equal(persisted.receipts.length, 1)
    assert.equal(persisted.session.active, false)
    assert.equal(app.CompleteDining.execute({ collectReceipt: true }).completed, false)
    assert.equal(writes, count + 1)
  }
})

function registeredApplication(platform) {
  const { createPinia } = require('pinia')
  const cache = new Map()
  const load = entry => loadModule(entry, platform, cache)
  const pinia = createPinia()
  const services = new Map()
  load('composition/registerApplication').registerApplication({ provide: (token, input) => services.set(token, input) }, pinia)
  const inputs = Object.assign({}, ...['dining/session', 'dining/history', 'dining/collection', 'dining/completion']
    .map(ctx => load('contexts/' + ctx + '/public')))
  const execute = (name, request = {}) => services.get(inputs[name + 'Input'].Token).execute(request)
  for (const name of ['LoadDining', 'LoadHistory', 'LoadCollection']) execute(name)
  return { execute, dining: load('stores/useDiningStore').useDiningStore(pinia),
    history: load('stores/useHistoryStore').useHistoryStore(pinia), collection: load('stores/useCollectionStore').useCollectionStore(pinia) }
}

test('真实组合根保存失败时三个 Store 保持原值，重试一次写入且提交后才通知', () => {
  const { watch } = require('vue')
  const data = new Map()
  let writes = 0
  let fail = false
  const platform = { getStorageSync: key => data.get(key), setStorageSync: (key, value) => {
    if (fail) throw Error('quota')
    writes++; data.set(key, plain(value))
  } }
  const app = registeredApplication(platform)
  app.execute('BeginSession', { ticketPrice: 20, diningMode: '单人' })
  app.execute('ChangeSelection', { productId: 'beef', change: 1 })
  const before = [app.dining.view, app.history.view, app.collection.view]
  const count = writes
  fail = true
  assert.throws(() => app.execute('CompleteDining', { collectReceipt: true }), /保存失败/)
  assert.equal(app.dining.view, before[0]); assert.equal(app.history.view, before[1]); assert.equal(app.collection.view, before[2])
  assert.equal(writes, count)
  assert.equal(data.get('buffet-state-v3').session.active, true)
  const seen = []
  const stops = [app.dining, app.history, app.collection].map(store => watch(() => store.view, () => {
    const saved = data.get('buffet-state-v3')
    assert.equal(saved.session.active, false)
    assert.equal(saved.records.length, 1)
    assert.equal(saved.receipts.length, 1)
    seen.push(store)
  }, { flush: 'sync' }))
  fail = false
  app.execute('CompleteDining', { collectReceipt: true })
  assert.equal(writes, count + 1)
  assert.equal(seen.length, 3)
  assert.equal(app.dining.view.session.active, false)
  assert.equal(app.history.view.records[0].value, 8)
  assert.equal(app.collection.view.receipts[0].value, 8)
  stops.forEach(stop => stop())
})

test('删除记录和收藏各自更新自己的 Store，不重建当前用餐或其他列表', () => {
  const data = new Map()
  const app = registeredApplication({ getStorageSync: key => data.get(key), setStorageSync: (key, value) => data.set(key, plain(value)) })
  app.execute('BeginSession', { ticketPrice: 20, diningMode: '单人' })
  app.execute('ChangeSelection', { productId: 'beef', change: 1 })
  app.execute('CompleteDining', { collectReceipt: true })
  const id = app.history.view.records[0].id
  const dining = app.dining.view
  const collection = app.collection.view
  app.execute('DeleteRecord', { recordId: id })
  assert.equal(app.history.view.records.length, 0)
  assert.equal(app.history.view.lifetimeDifference, 0)
  assert.equal(app.collection.view, collection)
  assert.equal(app.dining.view, dining)
  const history = app.history.view
  app.execute('DeleteReceipt', { receiptId: id })
  assert.equal(app.collection.view.receipts.length, 0)
  assert.equal(app.history.view, history)
  assert.equal(app.dining.view, dining)
  assert.equal(data.get('buffet-state-v3').records.length, 0)
  assert.equal(data.get('buffet-state-v3').receipts.length, 0)
})
