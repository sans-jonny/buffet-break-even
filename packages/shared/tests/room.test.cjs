const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// 直接转译 shared 包的 TypeScript，纯业务测试不引入构建产物。
function loadModule(entry, cache = new Map()) {
  const filename = path.resolve(__dirname, '../src', `${entry}.ts`)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  })
  vm.runInNewContext(outputText, {
    module, exports: module.exports,
    require: (name) => name.startsWith('.')
      ? loadModule(path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(filename), name)), cache)
      : require(name)
  }, { filename })
  return module.exports
}

const { Room } = loadModule('index')
const plain = value => JSON.parse(JSON.stringify(value))
const products = [
  { id: 'beef', name: '牛排肉', price: 8 },
  { id: 'salmon', name: '三文鱼刺身', price: 15 }
]
const host = { id: 'h1', nickname: '房主', isHost: true }
const guest = { id: 'g1', nickname: '小明', isHost: false }

test('创建房间只含房主，未开始', () => {
  const room = Room.create('ABC123', host)
  assert.equal(room.code, 'ABC123')
  assert.equal(room.hostId, 'h1')
  assert.equal(room.active, false)
  assert.equal(room.ticketPrice, 0)
  assert.deepEqual(plain(room.participants), [{ id: 'h1', nickname: '房主', isHost: true }])
  assert.deepEqual(plain(room.selections), {})
  assert.deepEqual(plain(room.rounds), [])
})

test('加入去重，修改昵称，参与者离开', () => {
  let room = Room.create('ABC123', host).join(guest)
  assert.deepEqual(plain(room.participants.map(p => p.id)), ['h1', 'g1'])
  assert.deepEqual(plain(room.join(guest).toSnapshot()), plain(room.toSnapshot())) // 重复加入无副作用

  room = room.rename('g1', '小红')
  assert.equal(room.participants.find(p => p.id === 'g1').nickname, '小红')

  room = room.leave('g1')
  assert.deepEqual(plain(room.participants.map(p => p.id)), ['h1'])
})

test('加入/改名/离开的输入校验', () => {
  const room = Room.create('ABC123', host)
  assert.throws(() => room.join({ id: 'g1', nickname: '', isHost: false }), /昵称不能为空/)
  assert.throws(() => room.join({ id: '', nickname: '小明', isHost: false }), /参与者编号不能为空/)
  assert.throws(() => room.rename('nobody', '小明'), /参与者不存在/)
  assert.throws(() => room.rename('h1', ''), /昵称不能为空/)
  assert.throws(() => room.leave('nobody'), /参与者不存在/)
  assert.throws(() => room.leave('h1'), /房主离开将结束房间/)
})

test('只有房主能开始，票价必须为正', () => {
  const room = Room.create('ABC123', host).join(guest)
  assert.throws(() => room.begin('g1', 200), /只有房主可以执行此操作/)
  assert.throws(() => room.begin('h1', 0), /请输入大于零的门票价格/)
  const started = room.begin('h1', 199.9)
  assert.equal(started.active, true)
  assert.equal(started.ticketPrice, 199.9)
  assert.throws(() => started.begin('h1', 200), /用餐已开始/)
})

test('待选按参与者分片，只能加减自己的', () => {
  const inactive = Room.create('ABC123', host).join(guest)
  assert.throws(() => inactive.changeSelection('g1', 'beef', 1, products), /请先开始用餐/)

  let next = inactive.begin('h1', 200)
  assert.throws(() => next.changeSelection('nobody', 'beef', 1, products), /参与者不存在/)
  assert.throws(() => next.changeSelection('h1', 'unknown', 1, products), /菜品不存在/)
  assert.throws(() => next.changeSelection('h1', 'beef', 2, products), /数量变化无效/)

  next = next.changeSelection('h1', 'beef', 1, products)
  next = next.changeSelection('g1', 'salmon', 1, products)
  assert.deepEqual(plain(next.selections), { h1: { beef: 1 }, g1: { salmon: 1 } })

  next = next.changeSelection('h1', 'beef', 1, products)
  next = next.changeSelection('h1', 'beef', -1, products)
  assert.deepEqual(plain(next.selections.h1), { beef: 1 })

  next = next.changeSelection('g1', 'salmon', -1, products)
  assert.equal('salmon' in next.selections.g1, false)
})

test('提交轮次归属参与者，只清空自己的待选', () => {
  let room = Room.create('ABC123', host).join(guest).begin('h1', 200)
  room = room.changeSelection('h1', 'beef', 1, products)
  room = room.changeSelection('h1', 'beef', 1, products)
  room = room.changeSelection('g1', 'salmon', 1, products)

  const before = room.commitRound('h1', products, '12:30:00')
  assert.equal(before.rounds.length, 1)
  assert.equal(before.rounds[0].participantId, 'h1')
  assert.equal(before.rounds[0].nickname, '房主')
  assert.equal(before.rounds[0].value, 16)
  assert.deepEqual(plain(before.rounds[0].lines), [{ name: '牛排肉', price: 8, count: 2 }])
  assert.equal('h1' in before.selections, false)
  assert.deepEqual(plain(before.selections.g1), { salmon: 1 })

  // 空待选提交不产生新轮次
  const empty = before.commitRound('h1', products, '12:31:00')
  assert.deepEqual(plain(empty.toSnapshot()), plain(before.toSnapshot()))
})

test('提交快照昵称不随改名漂移', () => {
  let room = Room.create('ABC123', host).join(guest).begin('h1', 200)
  room = room.changeSelection('g1', 'salmon', 1, products)
  room = room.commitRound('g1', products, '12:30:00')
  room = room.rename('g1', '小红')
  assert.equal(room.rounds[0].nickname, '小明')
  assert.equal(room.participants.find(p => p.id === 'g1').nickname, '小红')
})

test('结束用餐返回按名称归并的合计与按参与者分账', () => {
  let room = Room.create('ABC123', host).join(guest).begin('h1', 200)
  room = room.changeSelection('h1', 'beef', 1, products)
  room = room.changeSelection('h1', 'beef', 1, products)
  room = room.commitRound('h1', products, '12:30:00')
  room = room.changeSelection('g1', 'beef', 1, products)
  room = room.changeSelection('g1', 'salmon', 1, products)
  room = room.commitRound('g1', products, '12:32:00')

  const result = room.finish('h1', '2026-10-20')
  assert.equal(result.price, 200)
  assert.equal(result.value, 39)
  assert.deepEqual(plain(result.lines), [
    { name: '牛排肉', price: 8, count: 3 },
    { name: '三文鱼刺身', price: 15, count: 1 }
  ])
  assert.deepEqual(plain(result.byParticipant), [
    { participantId: 'h1', nickname: '房主', value: 16, lines: [{ name: '牛排肉', price: 8, count: 2 }] },
    { participantId: 'g1', nickname: '小明', value: 23, lines: [{ name: '牛排肉', price: 8, count: 1 }, { name: '三文鱼刺身', price: 15, count: 1 }] }
  ])
  assert.equal(result.rounds.length, 2)
})

test('非房主不能结束，未开始结束返回空', () => {
  const room = Room.create('ABC123', host).join(guest)
  assert.equal(room.finish('h1', '2026-10-20'), null)
  assert.throws(() => room.begin('h1', 200).finish('g1', '2026-10-20'), /只有房主可以执行此操作/)
})

test('房主关闭后清空待选与轮次，可重新开始', () => {
  let room = Room.create('ABC123', host).join(guest).begin('h1', 200)
  room = room.changeSelection('h1', 'beef', 1, products).commitRound('h1', products, '12:30:00')
  assert.throws(() => room.close('g1'), /只有房主可以执行此操作/)
  room = room.close('h1')
  assert.equal(room.active, false)
  assert.equal(room.ticketPrice, 0)
  assert.deepEqual(plain(room.selections), {})
  assert.deepEqual(plain(room.rounds), [])
  assert.deepEqual(plain(room.participants.map(p => p.id)), ['h1', 'g1'])
  room = room.begin('h1', 180)
  assert.equal(room.active, true)
})

test('变更返回新对象，旧聚合与快照不可通过引用修改', () => {
  const room = Room.create('ABC123', host).join(guest).begin('h1', 200)
  const changed = room.changeSelection('h1', 'beef', 1, products)
  assert.notEqual(changed, room)
  assert.deepEqual(plain(room.selections), {})

  const snapshot = plain(changed.toSnapshot())
  snapshot.selections.h1.beef = 99
  snapshot.participants[0].nickname = '被篡改'
  assert.equal(changed.selections.h1.beef, 1)
  assert.equal(changed.participants[0].nickname, '房主')
})

test('参与者离开后其已提交轮次仍计入分账', () => {
  let room = Room.create('ABC123', host).join(guest).begin('h1', 200)
  room = room.changeSelection('g1', 'salmon', 1, products)
  room = room.commitRound('g1', products, '12:30:00')
  room = room.leave('g1')
  assert.deepEqual(plain(room.participants.map(p => p.id)), ['h1'])

  const result = room.finish('h1', '2026-10-20')
  assert.equal(result.value, 15)
  assert.deepEqual(plain(result.byParticipant), [
    { participantId: 'g1', nickname: '小明', value: 15, lines: [{ name: '三文鱼刺身', price: 15, count: 1 }] }
  ])
})

test('金额按整数分汇总，避免浮点误差', () => {
  let room = Room.create('ABC123', host).begin('h1', 200)
  const cheap = [{ id: 'a', name: '零头菜', price: 0.1 }]
  room = room.changeSelection('h1', 'a', 1, cheap)
  room = room.changeSelection('h1', 'a', 1, cheap)
  room = room.changeSelection('h1', 'a', 1, cheap)
  room = room.commitRound('h1', cheap, '12:30:00')
  assert.equal(room.rounds[0].value, 0.3)
  assert.equal(room.committedValue, 0.3)
})
