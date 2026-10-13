import { computed, reactive, ref } from 'vue'
import { products } from '@/data/menu'
import { currentTime, shortDate } from '@/utils/format'
import type { DiningSession, ProductLine, ReceiptItem, SavedLine, SavedRound } from '@/types/buffet'

const SESSION_KEY = 'buffet-session-v2'
const RECEIPTS_KEY = 'buffet-receipts'
const RECORDS_KEY = 'buffet-records'

function createSession(): DiningSession {
  return {
    active: false,
    id: '',
    ticketPrice: 200,
    diningMode: '单人',
    restaurant: '牛牛',
    selected: {},
    rounds: []
  }
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    return uni.getStorageSync(key) || fallback
  } catch {
    return fallback
  }
}

const session = reactive<DiningSession>(readStorage(SESSION_KEY, createSession()))
const receipts = ref<ReceiptItem[]>(readStorage(RECEIPTS_KEY, []))
const records = ref<ReceiptItem[]>(readStorage(RECORDS_KEY, receipts.value.slice()))

const selectedLines = computed<ProductLine[]>(() =>
  products
    .filter((product) => session.selected[product.id])
    .map((product) => ({ product, count: session.selected[product.id] }))
)

const currentRoundValue = computed(() =>
  selectedLines.value.reduce((sum, line) => sum + line.product.price * line.count, 0)
)

const committedValue = computed(() =>
  session.rounds.reduce((sum, round) => sum + round.value, 0)
)

const displayValue = computed(() => committedValue.value + currentRoundValue.value)
const totalSelectedCount = computed(() => selectedLines.value.reduce((sum, line) => sum + line.count, 0))

function aggregateLines(rounds: SavedRound[], pendingLines: ProductLine[] = []) {
  const lines = new Map<string, SavedLine>()
  rounds.forEach((round) => {
    round.lines.forEach((line) => {
      const current = lines.get(line.name)
      if (current) current.count += line.count
      else lines.set(line.name, { ...line })
    })
  })
  pendingLines.forEach((line) => {
    const current = lines.get(line.product.name)
    if (current) current.count += line.count
    else lines.set(line.product.name, { name: line.product.name, count: line.count, price: line.product.price })
  })
  return Array.from(lines.values())
}

const allLines = computed<SavedLine[]>(() => aggregateLines(session.rounds))
const previewLines = computed<SavedLine[]>(() => aggregateLines(session.rounds, selectedLines.value))

const lifetimeDifference = computed(() =>
  records.value.reduce((sum, record) => sum + record.value - record.price, 0)
)
const totalRoundsSaved = computed(() => records.value.reduce((sum, record) => sum + record.rounds.length, 0))
const totalDishesSaved = computed(() => records.value.reduce(
  (sum, record) => sum + record.lines.reduce((lineSum, line) => lineSum + line.count, 0),
  0
))

function persistSession() {
  uni.setStorageSync(SESSION_KEY, { ...session })
}

function persistReceipts() {
  uni.setStorageSync(RECEIPTS_KEY, receipts.value)
}

function persistRecords() {
  uni.setStorageSync(RECORDS_KEY, records.value)
}

function beginSession(ticketPrice: number, diningMode: string) {
  Object.assign(session, {
    active: true,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ticketPrice,
    diningMode,
    restaurant: '牛牛',
    selected: {},
    rounds: []
  })
  persistSession()
}

function addItem(productId: string) {
  session.selected[productId] = (session.selected[productId] || 0) + 1
  persistSession()
}

function removeItem(productId: string) {
  if ((session.selected[productId] || 0) <= 1) delete session.selected[productId]
  else session.selected[productId] -= 1
  persistSession()
}

function buildCurrentRound(): SavedRound {
  return {
    time: currentTime(true),
    value: currentRoundValue.value,
    lines: selectedLines.value.map((line) => ({
      name: line.product.name,
      count: line.count,
      price: line.product.price
    }))
  }
}

function commitRound() {
  if (!selectedLines.value.length) return 0
  session.rounds.push(buildCurrentRound())
  session.selected = {}
  persistSession()
  return session.rounds.length
}

function finishDining() {
  if (selectedLines.value.length) commitRound()
  return session.rounds.length > 0
}

function buildReceipt(): ReceiptItem {
  return {
    id: session.id,
    restaurant: session.restaurant,
    date: `${shortDate()} ${currentTime()}`,
    price: session.ticketPrice,
    value: committedValue.value,
    lines: allLines.value.map((line) => ({ ...line })),
    rounds: JSON.parse(JSON.stringify(session.rounds))
  }
}

function upsertItem(items: ReceiptItem[], item: ReceiptItem) {
  const existing = items.findIndex((candidate) => candidate.id === item.id)
  if (existing >= 0) items.splice(existing, 1, item)
  else items.unshift(item)
}

function completeDining(saveToReceipts = false) {
  if (!finishDining()) return null
  const record = buildReceipt()
  upsertItem(records.value, record)
  persistRecords()
  if (saveToReceipts) {
    upsertItem(receipts.value, record)
    persistReceipts()
  }
  clearSession()
  return record
}

function deleteReceipt(index: number) {
  if (index < 0 || index >= receipts.value.length) return
  receipts.value.splice(index, 1)
  persistReceipts()
}

function deleteRecord(index: number) {
  if (index < 0 || index >= records.value.length) return
  records.value.splice(index, 1)
  persistRecords()
}

function clearSession() {
  Object.assign(session, createSession())
  persistSession()
}

export function useBuffetStore() {
  return {
    session,
    receipts,
    records,
    selectedLines,
    currentRoundValue,
    committedValue,
    displayValue,
    totalSelectedCount,
    allLines,
    previewLines,
    lifetimeDifference,
    totalRoundsSaved,
    totalDishesSaved,
    beginSession,
    addItem,
    removeItem,
    commitRound,
    finishDining,
    completeDining,
    deleteReceipt,
    deleteRecord,
    clearSession
  }
}
