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
    require: (name) => name.startsWith('@/') ? loadModule(name.slice(2), uni, cache) : require(name)
  }, { filename })
  return module.exports
}

const core = loadModule('domain/buffet')
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

test('状态层结束用餐提交待选、保存明细和可选小票、清空会话并持久化', () => {
  const storage = new Map()
  const uni = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, plain(value))
  }
  const store = loadModule('store/buffet', uni).useBuffetStore()
  assert.equal(store.completeDining(), null)
  store.beginSession(100, '单人')
  store.addItem('beef')
  assert.equal(store.commitRound(), 1)
  store.addItem('beef')
  const record = store.completeDining(true)
  assert.equal(record.rounds.length, 2)
  assert.equal(record.lines[0].count, 2)
  assert.equal(record.value, 16)
  assert.equal(store.records.value.length, 1)
  assert.equal(store.receipts.value.length, 1)
  assert.equal(store.session.active, false)
  assert.equal(storage.get('buffet-session-v2').active, false)
  assert.equal(storage.get('buffet-records')[0].value, 16)
  assert.equal(storage.get('buffet-receipts')[0].value, 16)
  assert.equal(store.completeDining(true), null)
  store.beginSession(50, '多人')
  store.addItem('juice')
  store.completeDining(false)
  assert.equal(store.records.value.length, 2)
  assert.equal(store.receipts.value.length, 1)
  store.deleteRecord(0)
  assert.equal(storage.get('buffet-records').length, 1)
})
