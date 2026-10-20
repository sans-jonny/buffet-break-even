const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// 直接转译 server 的 TypeScript；@buffet/shared 指向共享包源码，其余落到真实 require（node:crypto 等）。
function makeLoader(rootDir) {
  return function loadModule(entry, cache = new Map()) {
    const filename = path.resolve(rootDir, `${entry}.ts`)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    })
    vm.runInNewContext(outputText, {
      module, exports: module.exports,
      require: (name) => {
        if (name === '@buffet/shared') return loadShared('index', cache)
        if (name.startsWith('.')) return loadModule(path.relative(rootDir, path.resolve(path.dirname(filename), name)), cache)
        return require(name)
      }
    }, { filename })
    return module.exports
  }
}

const loadShared = makeLoader(path.resolve(__dirname, '../../packages/shared/src'))
const loadServer = makeLoader(path.resolve(__dirname, '../src'))

const { RoomService } = loadServer('room/room.service')
const plain = value => JSON.parse(JSON.stringify(value))
const products = [
  { id: 'beef', name: '牛排肉', price: 8 },
  { id: 'salmon', name: '三文鱼刺身', price: 15 }
]
const fixedClock = { time: () => '12:30', date: () => '2026-10-20' }

function startedRoom(service) {
  const created = service.createRoom('房主')
  service.joinRoom(created.roomCode, '小明')
  service.begin(created.roomCode, created.participantId, 200)
  return created
}

test('创建房间返回房主凭据与未开始状态', () => {
  const service = new RoomService(products, fixedClock)
  const created = service.createRoom('房主')
  assert.match(created.roomCode, /^[A-Z2-9]{6}$/)
  assert.ok(created.participantId)
  assert.ok(created.token)
  assert.equal(created.state.active, false)
  assert.deepEqual(plain(created.state.participants), [{ id: created.participantId, nickname: '房主', isHost: true }])
})

test('加入房间、开始用餐与按参与者分片选菜', () => {
  const service = new RoomService(products, fixedClock)
  const created = service.createRoom('房主')
  assert.throws(() => service.joinRoom('NOPE01', '小明'), /房间不存在/)

  const joined = service.joinRoom(created.roomCode, '小明')
  assert.deepEqual(plain(joined.state.participants.map(p => p.nickname)), ['房主', '小明'])

  assert.throws(() => service.begin(created.roomCode, joined.participantId, 200), /只有房主可以执行此操作/)
  const started = service.begin(created.roomCode, created.participantId, 200)
  assert.equal(started.active, true)
  assert.equal(started.ticketPrice, 200)

  let state = service.changeSelection(created.roomCode, created.participantId, 'beef', 1)
  state = service.changeSelection(created.roomCode, joined.participantId, 'salmon', 1)
  assert.deepEqual(plain(state.selections), {
    [created.participantId]: { beef: 1 },
    [joined.participantId]: { salmon: 1 }
  })
})

test('提交轮次归属参与者并清空其待选', () => {
  const service = new RoomService(products, fixedClock)
  const created = startedRoom(service)
  const joined = service.getRoom(created.roomCode).participants.find(p => !p.isHost)
  service.changeSelection(created.roomCode, joined.id, 'salmon', 1)

  const state = service.commitRound(created.roomCode, joined.id)
  assert.equal(state.rounds.length, 1)
  assert.equal(state.rounds[0].participantId, joined.id)
  assert.equal(state.rounds[0].nickname, '小明')
  assert.equal(state.rounds[0].value, 15)
  assert.deepEqual(plain(state.selections), {})
})

test('结束用餐返回按参与者分账', () => {
  const service = new RoomService(products, fixedClock)
  const created = startedRoom(service)
  const joined = service.getRoom(created.roomCode).participants.find(p => !p.isHost)
  service.changeSelection(created.roomCode, created.participantId, 'beef', 1)
  service.commitRound(created.roomCode, created.participantId)
  service.changeSelection(created.roomCode, joined.id, 'salmon', 1)
  service.commitRound(created.roomCode, joined.id)

  const result = service.finish(created.roomCode, created.participantId)
  assert.equal(result.value, 23)
  assert.deepEqual(plain(result.byParticipant.map(p => p.nickname)), ['房主', '小明'])
})

test('参与者离开保留轮次，房主离开销毁房间', () => {
  const service = new RoomService(products, fixedClock)
  const created = startedRoom(service)
  const joined = service.getRoom(created.roomCode).participants.find(p => !p.isHost)

  const afterLeave = service.leave(created.roomCode, joined.id)
  assert.deepEqual(plain(afterLeave.participants.map(p => p.id)), [created.participantId])

  assert.equal(service.leave(created.roomCode, created.participantId), null)
  assert.equal(service.getRoom(created.roomCode), null)
})

test('空闲房间被周期清理', () => {
  const service = new RoomService(products, fixedClock)
  const created = service.createRoom('房主')
  assert.ok(service.getRoom(created.roomCode))
  service.sweep(Date.now() + 60 * 60 * 1000)
  assert.equal(service.getRoom(created.roomCode), null)
})

test('非法昵称与参数被拒绝', () => {
  const service = new RoomService(products, fixedClock)
  assert.throws(() => service.createRoom(''), /昵称不能为空/)
  const created = service.createRoom('房主')
  assert.throws(() => service.changeSelection(created.roomCode, created.participantId, 'beef', 1), /请先开始用餐/)
})
