// 手动冒烟：连接真实 ws 服务，走完 建房间 → 加入 → 开始 → 选菜 → 提交 → 结束 全流程。
// 用法：先启动服务（node dist/main.js），再 `node scripts/smoke.cjs`。
const WebSocket = require('ws')

const URL = 'ws://localhost:3000/room'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL)
    const inbox = []
    ws.on('message', data => inbox.push(JSON.parse(data.toString())))
    ws.on('open', () => resolve({ws, inbox}))
    ws.on('error', reject)
  })
}

function send(ws, event, data = {}) {
  ws.send(JSON.stringify({event, data}))
}

async function waitFor(inbox, event, timeout = 3000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const found = inbox.find(m => m.event === event)
    if (found) return found
    await sleep(10)
  }
  throw new Error(`等待 ${event} 超时，收到: ${inbox.map(m => m.event).join(',')}`)
}

async function main() {
  const host = await connect()
  send(host.ws, 'createRoom', {nickname: '房主'})
  const created = await waitFor(host.inbox, 'created')
  console.log('created roomCode =', created.data.roomCode)
  await waitFor(host.inbox, 'roomState')

  const guest = await connect()
  send(guest.ws, 'joinRoom', {roomCode: created.data.roomCode, nickname: '小明'})
  const joined = await waitFor(guest.inbox, 'joined')
  console.log('guest joined, participantId 前缀 =', joined.data.participantId.slice(0, 8))
  await sleep(20)

  const roomStateCount = host.inbox.filter(m => m.event === 'roomState').length
  send(host.ws, 'begin', {ticketPrice: 200})
  while (host.inbox.filter(m => m.event === 'roomState').length <= roomStateCount) await sleep(10)
  const beginState = host.inbox.filter(m => m.event === 'roomState').at(-1)
  console.log('begin → active =', beginState.data.active, ', price =', beginState.data.ticketPrice)

  send(host.ws, 'changeSelection', {productId: 'beef', change: 1})
  send(guest.ws, 'changeSelection', {productId: 'salmon', change: 1})
  await sleep(30)

  send(host.ws, 'commitRound', {})
  send(guest.ws, 'commitRound', {})
  await sleep(30)

  const stateAfterCommit = host.inbox.filter(m => m.event === 'roomState').at(-1)
  console.log('rounds 数 =', stateAfterCommit.data.rounds.length)

  send(host.ws, 'finish', {})
  const finished = await waitFor(host.inbox, 'finished')
  console.log('finished value =', finished.data.value)
  console.log('byParticipant =', finished.data.byParticipant.map(p => `${p.nickname}:${p.value}`).join(' / '))

  host.ws.close()
  guest.ws.close()
  console.log('SMOKE OK')
  process.exit(0)
}

main().catch(err => {
  console.error('SMOKE FAIL:', err.message)
  process.exit(1)
})
