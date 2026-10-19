import type {BuffetReader} from '../../application/port/out/BuffetReader'
import type {BuffetWriter} from '../../application/port/out/BuffetWriter'
import type {BuffetSnapshot} from '@/contexts/independent/buffet/domain/BuffetSnapshot'
import type {DiningSession} from '@/contexts/independent/buffet/domain/DiningSession'
import type {Receipt} from '@/contexts/independent/buffet/domain/Receipt'
import type {SavedLine} from '@/contexts/independent/buffet/domain/SavedLine'
import type {SavedRound} from '@/contexts/independent/buffet/domain/SavedRound'
import {createSession} from '@/contexts/independent/buffet/domain/session'

import type {StoragePort} from './StoragePort'
// 一个键提交完整快照，避免结算时三个独立写入造成记录与会话不一致。
export const SNAPSHOT_KEY = 'buffet-state-v3'
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

function line(value: unknown): SavedLine {
    const data = object(value)
    return {name: string(data.name), price: amount(data.price), count: count(data.count)}
}

function round(value: unknown): SavedRound {
    const data = object(value)
    return {time: string(data.time), value: amount(data.value), lines: list(data.lines, line)}
}

function receipt(value: unknown): Receipt {
    const data = object(value)
    return {
        id: string(data.id), restaurant: string(data.restaurant), date: string(data.date), price: amount(data.price),
        value: amount(data.value), lines: list(data.lines, line), rounds: list(data.rounds, round)
    }
}

function session(value: unknown): DiningSession {
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

const missing = (value: unknown) => value === undefined || value === null || value === ''

export class UniBuffetGateway implements BuffetReader, BuffetWriter {
    constructor(private readonly storage: StoragePort) {
    }

    load(): BuffetSnapshot {
        try {
            const saved = this.storage.getStorageSync(SNAPSHOT_KEY)
            if (!missing(saved)) {
                const data = object(saved)
                if (data.version !== 3) throw new Error('未知存储版本')
                return {
                    session: session(data.session),
                    records: list(data.records, receipt),
                    receipts: list(data.receipts, receipt)
                }
            }
            const oldSession = this.storage.getStorageSync('buffet-session-v2')
            const oldReceipts = this.storage.getStorageSync('buffet-receipts')
            const oldRecords = this.storage.getStorageSync('buffet-records')
            const receipts = missing(oldReceipts) ? [] : list(oldReceipts, receipt)
            return {
                session: missing(oldSession) ? createSession() : session(oldSession), receipts,
                records: missing(oldRecords) ? receipts.map(item => receipt(item)) : list(oldRecords, receipt)
            }
        } catch {
            throw new Error('读取用餐数据失败，请重试；原有记录已保留')
        }
    }

    save(snapshot: BuffetSnapshot): void {
        try {
            // 显式映射到持久化 DTO，不保留 Domain / Presenter 对象引用。
            this.storage.setStorageSync(SNAPSHOT_KEY, {
                version: 3, session: session(snapshot.session),
                records: snapshot.records.map(receipt), receipts: snapshot.receipts.map(receipt)
            })
        } catch {
            throw new Error('保存失败，请检查存储空间后重试')
        }
    }
}
