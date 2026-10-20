const assert = require('node:assert/strict')
const test = require('node:test')
const {application, loadModule, plain} = require('../helpers/runtime.cjs')
const {isReadonly, nextTick} = require('vue')

test('初始化失败保留已有数据和展示状态，恢复后重试无需写存储', () => {
  const seed = application()
  const Session = seed.load('contexts/dining/session/model/DiningSession').DiningSession
  const session = Session.empty().begin(20, '单人', 'restored').changeSelection('beef', 1, seed.execute('GetCatalog').products)
  const record = session.commitRound(seed.execute('GetCatalog').products, '12:00').preview([], 'today').toSnapshot()
  const saved = {version: 3, session: session.toSnapshot(), records: [record], receipts: [record]}
  let fail = true
  let writes = 0
  const app = application({getStorageSync: key => {if (fail) throw Error('unavailable'); return key === 'buffet-state-v3' ? saved : undefined}, setStorageSync: () => writes++})
  const before = [app.dining.view, app.history.view, app.collection.view]
  assert.equal(app.status.view.status, 'idle')
  assert.equal(app.bootstrap.initialize(), false)
  assert.equal(app.status.view.status, 'error')
  assert.match(app.status.view.message, /读取用餐数据失败/)
  assert.equal(app.dining.view, before[0]); assert.equal(app.history.view, before[1]); assert.equal(app.collection.view, before[2])
  fail = false
  assert.equal(app.bootstrap.initialize(), true)
  assert.equal(app.status.view.status, 'ready')
  assert.equal(app.dining.view.session.id, 'restored')
  assert.equal(app.dining.view.displayValue, 8)
  assert.equal(app.history.view.records[0].id, 'restored')
  assert.equal(app.collection.view.receipts[0].id, 'restored')
  assert.equal(saved.session.selected.beef, 1)
  assert.equal(writes, 0)
})

test('后续加载投影失败也不会发布先前暂存的投影，修复后可完整重试', () => {
  const cache = new Map()
  const load = name => loadModule(name, {}, cache)
  const Database = load('infrastructure/persistence/LocalDiningDatabase').LocalDiningDatabase
  const Bootstrap = load('ui/composition/ApplicationBootstrap').ApplicationBootstrap
  let writes = 0
  const database = new Database({load: () => ({session: {}, records: [], receipts: []}), save: () => writes++})
  /** @type {string[]} */
  const published = []
  let fail = true
  let status
  const bootstrap = new Bootstrap({
    dining: {execute: () => database.afterCommit('dining', () => published.push('dining'))},
    history: {execute: () => {if (fail) throw Error('projection failed'); database.afterCommit('history', () => published.push('history'))}},
    collection: {execute: () => database.afterCommit('collection', () => published.push('collection'))},
  }, database.transaction.bind(database), {present: view => status = view})
  assert.equal(bootstrap.initialize(), false)
  assert.equal(status.status, 'error')
  assert.deepEqual(published, [])
  fail = false
  assert.equal(bootstrap.initialize(), true)
  assert.deepEqual(published, ['dining', 'history', 'collection'])
  assert.equal(status.status, 'ready')
  assert.equal(writes, 0)
})

test('只读查询入口不暴露写入方法，投影和按 ID 查询随 Store 更新', async () => {
  const app = application()
  app.bootstrap.initialize()
  const dining = app.load('ui/composables/useDiningView').useDiningView()
  const history = app.load('ui/composables/useHistoryView').useHistoryView()
  const collection = app.load('ui/composables/useCollectionView').useCollectionView()
  for (const facade of [dining, history, collection]) {
    assert.equal(facade.present, undefined)
    assert.equal(isReadonly(facade.view), true)
    assert.equal(isReadonly(facade.view.value), true)
  }
  app.execute('BeginSession', {ticketPrice: 20, diningMode: '单人'})
  app.execute('ChangeSelection', {productId: 'beef', change: 1})
  assert.equal(dining.displayValue.value, 8)
  const result = app.execute('CompleteDining', {collectReceipt: true})
  await nextTick()
  assert.equal(history.recordById(result.receiptId).value, 8)
  assert.equal(collection.receiptById(result.receiptId).value, 8)
  app.execute('DeleteRecord', {recordId: result.receiptId})
  assert.equal(history.recordById(result.receiptId), undefined)
  assert.equal(collection.receiptById(result.receiptId).value, 8)
})

test('默认视图与真实空会话投影一致，纯映射结果不泄露领域引用', () => {
  const app = application()
  const Session = app.load('contexts/dining/session/model/DiningSession').DiningSession
  const toView = app.load('contexts/dining/session/infrastructure/presentation/toDiningView').toDiningView
  const empty = app.load('presentation/dining/emptyDiningView').emptyDiningView
  const products = app.execute('GetCatalog').products
  assert.deepEqual(plain(toView(Session.empty(), products, '', () => ({emoji: '', gradient: ''}))), plain(empty()))
  const session = Session.empty().begin(20, '单人', 'm').changeSelection('beef', 1, products).commitRound(products, '12:00')
  const view = toView(session, products, 'today', () => ({emoji: '', gradient: ''}))
  view.session.rounds[0].lines[0].count = 999
  view.previewReceipt.rounds[0].lines[0].count = 888
  assert.equal(session.rounds[0].lines[0].count, 1)
})

test('持久化格式转换仍拒绝未知版本和损坏数据，不回退覆盖旧记录', () => {
  const app = application()
  const Session = app.load('contexts/dining/session/model/DiningSession').DiningSession
  const {encodeSnapshot, decodeSnapshot} = app.load('infrastructure/persistence/serialization/SnapshotCodec')
  const snapshot = {session: Session.empty().toSnapshot(), records: [], receipts: []}
  const encoded = encodeSnapshot(snapshot)
  assert.equal(encoded.version, 3)
  assert.deepEqual(plain(decodeSnapshot(encoded)), plain(snapshot))
  assert.throws(() => decodeSnapshot({...encoded, version: 9}), /未知存储版本/)
  assert.throws(() => decodeSnapshot({...encoded, receipts: [{id: 'broken'}]}))
  encoded.session.selected.bad = 2
  assert.deepEqual(plain(snapshot.session.selected), {})
})
