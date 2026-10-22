const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// 与 dining.test.cjs 相同的运行时转译加载器，用于直接加载前端房间客户端源码。
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

const { CreateRoomInteractor } = loadModule('contexts/room/application/interactor/CreateRoomInteractor')
const { JoinRoomInteractor } = loadModule('contexts/room/application/interactor/JoinRoomInteractor')
const { ChangeRoomSelectionInteractor } = loadModule('contexts/room/application/interactor/ChangeRoomSelectionInteractor')
const { CommitRoomRoundInteractor } = loadModule('contexts/room/application/interactor/CommitRoomRoundInteractor')
const { RoomPresenter } = loadModule('contexts/room/infrastructure/presentation/RoomPresenter')
const plain = value => JSON.parse(JSON.stringify(value))

function fakeTransport() {
  const sent = []
  return { sent, send(event, data) { sent.push({ event, data }) } }
}

test('房间用例把正确的协议事件发给服务端', () => {
  const transport = fakeTransport()
  new CreateRoomInteractor(transport).execute({ nickname: '小明' })
  assert.deepEqual(plain(transport.sent), [{ event: 'createRoom', data: { nickname: '小明' } }])

  transport.sent.length = 0
  new JoinRoomInteractor(transport).execute({ roomCode: 'ABC123', nickname: '小红' })
  assert.deepEqual(plain(transport.sent), [{ event: 'joinRoom', data: { roomCode: 'ABC123', nickname: '小红' } }])

  transport.sent.length = 0
  new ChangeRoomSelectionInteractor(transport).execute({ productId: 'beef', change: 1 })
  assert.deepEqual(plain(transport.sent), [{ event: 'changeSelection', data: { productId: 'beef', change: 1 } }])

  transport.sent.length = 0
  new CommitRoomRoundInteractor(transport).execute()
  assert.equal(transport.sent.length, 1)
  assert.equal(transport.sent[0].event, 'commitRound')
})

test('presenter 把房间快照映射成按人分片的展示视图', () => {
  let view
  const store = { present(v) { view = v } }
  const catalog = {
    product(id) {
      return id === 'beef' ? { id: 'beef', name: '牛排肉', price: 8 } : { id: 'salmon', name: '三文鱼刺身', price: 15 }
    }
  }
  const appearance = id => id === 'beef' ? { emoji: '🥩', gradient: 'g' } : { emoji: '🍣', gradient: 'g' }
  const presenter = new RoomPresenter(store, catalog, appearance)

  presenter.presentCredentials({ roomCode: 'ABC123', participantId: 'p2', token: 't' })
  presenter.presentState({
    code: 'ABC123', hostId: 'p1', active: true, ticketPrice: 200,
    participants: [
      { id: 'p1', nickname: '房主', isHost: true },
      { id: 'p2', nickname: '小明', isHost: false }
    ],
    selections: { p1: { beef: 2 }, p2: { salmon: 1 } },
    rounds: [{ participantId: 'p1', nickname: '房主', time: '12:00', value: 16, lines: [{ name: '牛排肉', price: 8, count: 2 }] }]
  })

  assert.equal(view.roomCode, 'ABC123')
  assert.equal(view.selfId, 'p2')
  assert.equal(view.active, true)
  assert.deepEqual(plain(view.participants), [
    { id: 'p1', nickname: '房主', isHost: true, isSelf: false },
    { id: 'p2', nickname: '小明', isHost: false, isSelf: true }
  ])
  // 房主的待选被解析出名称与表情，小明的待选是另一片。
  assert.deepEqual(plain(view.selections.find(s => s.participantId === 'p1').lines), [
    { id: 'beef', name: '牛排肉', price: 8, count: 2, emoji: '🥩', gradient: 'g' }
  ])
  assert.deepEqual(plain(view.selections.find(s => s.participantId === 'p2').lines), [
    { id: 'salmon', name: '三文鱼刺身', price: 15, count: 1, emoji: '🍣', gradient: 'g' }
  ])
  assert.equal(view.committedValue, 16)
})

test('presenter 把结算结果映射成含分账的视图', () => {
  let view
  const presenter = new RoomPresenter(
    { present(v) { view = v } },
    { product() { return undefined } },
    () => ({ emoji: '🍽️', gradient: 'g' })
  )
  presenter.presentResult({
    code: 'ABC123', date: '2026-10-20', price: 200, value: 23,
    lines: [{ name: '牛排肉', price: 8, count: 2 }],
    rounds: [{ participantId: 'p1', nickname: '房主', time: '12:00', value: 8, lines: [{ name: '牛排肉', price: 8, count: 1 }] }],
    byParticipant: [
      { participantId: 'p1', nickname: '房主', value: 8, lines: [{ name: '牛排肉', price: 8, count: 1 }] },
      { participantId: 'p2', nickname: '小明', value: 15, lines: [{ name: '三文鱼刺身', price: 15, count: 1 }] }
    ]
  })

  assert.equal(view.result.value, 23)
  assert.equal(view.result.rounds.length, 1)
  assert.equal(view.result.rounds[0].lines[0].name, '牛排肉')
  assert.equal(view.result.byParticipant.length, 2)
  assert.equal(view.result.byParticipant[1].value, 15)
})
