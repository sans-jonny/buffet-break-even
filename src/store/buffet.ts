import { computed, reactive, ref } from 'vue'
import { products } from '@/data/menu'
import { currentTime, shortDate } from '@/utils/format'
import type { DiningSession, ReceiptItem } from '@/types/buffet'
import {
  aggregateLines, buildReceipt, changeSelection, commitSessionRound, createDiningSession,
  createSession, getCommittedValue, getRecordStats, getRoundValue, getSelectedCount,
  getSelectedLines, upsertReceipt
} from '@/domain/buffet'

const SESSION_KEY = 'buffet-session-v2'
const RECEIPTS_KEY = 'buffet-receipts'
const RECORDS_KEY = 'buffet-records'

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

const selectedLines = computed(() => getSelectedLines(products, session.selected))
const currentRoundValue = computed(() => getRoundValue(selectedLines.value))
const committedValue = computed(() => getCommittedValue(session.rounds))
const displayValue = computed(() => committedValue.value + currentRoundValue.value)
const totalSelectedCount = computed(() => getSelectedCount(selectedLines.value))
const allLines = computed(() => aggregateLines(session.rounds))
const previewLines = computed(() => aggregateLines(session.rounds, selectedLines.value))

const recordStats = computed(() => getRecordStats(records.value))
const lifetimeDifference = computed(() => recordStats.value.lifetimeDifference)
const totalRoundsSaved = computed(() => recordStats.value.totalRoundsSaved)
const totalDishesSaved = computed(() => recordStats.value.totalDishesSaved)

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
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  Object.assign(session, createDiningSession(ticketPrice, diningMode, id))
  persistSession()
}

function addItem(productId: string) {
  session.selected = changeSelection(session.selected, productId, 1)
  persistSession()
}

function removeItem(productId: string) {
  session.selected = changeSelection(session.selected, productId, -1)
  persistSession()
}

function commitRound() {
  const next = commitSessionRound(session, products, currentTime(true))
  if (next === session) return 0
  Object.assign(session, next)
  persistSession()
  return session.rounds.length
}

function finishDining() {
  if (selectedLines.value.length) commitRound()
  return session.rounds.length > 0
}

function completeDining(saveToReceipts = false) {
  if (!finishDining()) return null
  const record = buildReceipt(session, `${shortDate()} ${currentTime()}`)
  records.value = upsertReceipt(records.value, record)
  persistRecords()
  if (saveToReceipts) {
    receipts.value = upsertReceipt(receipts.value, record)
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
