const test = require('node:test')
const assert = require('node:assert/strict')
const {loadModule, plain, application} = require('../helpers/runtime.cjs')

test('ISO 时间按设备时区格式化，包含时区偏移和跨日，不修改旧格式', () => {
  const previous = process.env.TZ
  process.env.TZ = 'Asia/Taipei'
  try {
    const {formatDateTime, formatRoundTime, formatReceiptTimestamp} = loadModule('ui/format/time')
    assert.equal(formatReceiptTimestamp('2026-10-23T08:17:13.654Z'),'2026-10-23 16:17:13')
    assert.equal(formatDateTime('2026-10-23T08:17:13.654Z'), '2026-10-23 16:17')
    assert.equal(formatRoundTime('2026-10-23T08:17:13.654Z'), '16:17:13')
    assert.equal(formatDateTime('2026-10-23T20:17:13Z'), '2026-10-24 04:17')
    assert.equal(formatDateTime('2026-10-23T16:17:13+08:00'), '2026-10-23 16:17')
    for (const value of ['', '12:34:56', '2026-10-23 12:34', '10/23/26 12:34', 'invalid', '2026-13-23T08:17:13Z']) {
      assert.equal(formatDateTime(value), value)
      assert.equal(formatRoundTime(value), value)
    }
  } finally {if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous}
})

test('收藏、点餐明细和共享用餐投影保留原始时间，UI 独立格式化', () => {
  const previous = process.env.TZ
  process.env.TZ = 'Asia/Taipei'
  try {
    const {toReceiptView} = loadModule('presentation/receipt/toReceiptView')
    const {toRoomDiningView} = loadModule('presentation/dining/toRoomDiningView')
    const {formatDateTime, formatRoundTime} = loadModule('ui/format/time')
    const timestamp = '2026-10-23T08:17:13.654Z'
    const receipt = {id: 'meal-1', restaurant: '牛牛', date: timestamp, price: 200, value: 10,
      participants: ['小羊'], lines: [{name: '苹果汁', count: 1, price: 10}],
      rounds: [{time: timestamp, value: 10, lines: [{name: '苹果汁', count: 1, price: 10}]}]}
    const original = plain(receipt)
    const view = toReceiptView(receipt)
    assert.equal(view.date, timestamp)
    assert.equal(view.rounds[0].time, timestamp)
    assert.equal(formatDateTime(view.date), '2026-10-23 16:17')
    assert.equal(formatRoundTime(view.rounds[0].time), '16:17:13')
    const room = {id: 'room-1', code: '123456', revision: 1, hostId: 'host', status: 'ended', ticketPrice: 200,
      selected: {}, rounds: receipt.rounds, members: [], receipt}
    const dining = toRoomDiningView({...room, drafts: {'': {selected: room.selected, rounds: room.rounds}}}, [], '')
    assert.equal(dining.session.rounds[0].time, timestamp)
    assert.equal(dining.previewReceipt.date, view.date)
    assert.deepEqual(plain(receipt), original)
  } finally {if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous}
})

test('新单人用餐与多人记录的 Store 保持 ISO 时间，展示时才格式化', () => {
  const app = application()
  app.execute('BeginSession', {ticketPrice: 100, diningMode: '单人'})
  app.execute('ChangeSelection', {productId: 'apple', change: 1})
  app.execute('CommitRound')
  const roundTime = app.dining.view.session.rounds[0].time
  assert.match(roundTime, /^\d{4}-\d{2}-\d{2}T.*Z$/)
  app.execute('CompleteDining', {collectReceipt: true})
  assert.match(app.history.view.records[0].date, /^\d{4}-\d{2}-\d{2}T.*Z$/)
  assert.equal(app.history.view.records[0].rounds[0].time, roundTime)
  assert.equal(app.collection.view.receipts[0].date, app.history.view.records[0].date)
  const shared = {id: 'room', restaurant: '牛牛', date: '2026-10-23T08:17:13.654Z', price: 200, value: 10,
    lines: [{name: '苹果汁', count: 1, price: 10}], rounds: [{time: '2026-10-23T08:16:13.654Z', value: 10, lines: [{name: '苹果汁', count: 1, price: 10}]}]}
  app.execute('SaveRoomResult', {receipt: shared, collectReceipt: true})
  assert.equal(app.history.view.records[0].date, shared.date)
  assert.equal(app.collection.view.receipts[0].rounds[0].time, shared.rounds[0].time)
})
