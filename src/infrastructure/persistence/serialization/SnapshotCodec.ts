import type {SnapshotDocument} from '../schema/SnapshotDocument'
import type {StoredSession} from '../schema/StoredSession'
import type {StoredReceipt} from '../schema/StoredReceipt'
import type {StoredLine} from '../schema/StoredLine'
import type {StoredRound} from '../schema/StoredRound'

const object = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('存储数据格式错误')
    return value as Record<string, unknown>
}
const string = (value: unknown): string => {
    if (typeof value !== 'string') throw new Error('存储文本无效');
    return value
}
const amount = (value: unknown): number => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100))) throw new Error('存储金额无效')
    return value
}
const count = (value: unknown): number => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) throw new Error('存储数量无效')
    return value
}

function list<T>(value: unknown, map: (item: unknown) => T): T[] {
    if (!Array.isArray(value)) throw new Error('存储列表无效')
    return value.map(map)
}

function line(value: unknown): StoredLine {
    const data = object(value)
    return {name: string(data.name), price: amount(data.price), count: count(data.count)}
}

function round(value: unknown): StoredRound {
    const data = object(value)
    return {time: string(data.time), value: amount(data.value), lines: list(data.lines, line)}
}

export function decodeReceipt(value: unknown): StoredReceipt {
    const data = object(value)
    return {
        id: string(data.id), restaurant: string(data.restaurant), date: string(data.date), price: amount(data.price),
        value: amount(data.value), lines: list(data.lines, line), rounds: list(data.rounds, round)
    }
}

export function decodeSession(value: unknown): StoredSession {
    const data = object(value)
    if (typeof data.active !== 'boolean') throw new Error('存储会话无效')
    const selected = Object.fromEntries(Object.entries(object(data.selected)).map(([id, value]) => [id, count(value)]))
    return {
        active: data.active,
        id: string(data.id),
        ticketPrice: amount(data.ticketPrice),
        diningMode: string(data.diningMode),
        restaurant: string(data.restaurant),
        selected,
        rounds: list(data.rounds, round)
    }
}


export const isMissing = (value: unknown) => value === undefined || value === null || value === ''

export function decodeSnapshot(value: unknown): SnapshotDocument {
    const data = object(value)
    if (data.version !== 3) throw new Error('未知存储版本')
    return {session: decodeSession(data.session), records: list(data.records, decodeReceipt), receipts: list(data.receipts, decodeReceipt)}
}

export function encodeSnapshot(snapshot: SnapshotDocument) {
    return {version: 3, session: decodeSession(snapshot.session), records: snapshot.records.map(decodeReceipt), receipts: snapshot.receipts.map(decodeReceipt)}
}

export function decodeReceipts(value: unknown): StoredReceipt[] {
    return list(value, decodeReceipt)
}
