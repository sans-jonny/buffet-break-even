import type {DiningRecord} from '../entity/DiningRecord'
import {cents} from '@/utils/money'

/** 无独立业务标识的领域集合，管理记录实体并隔离外部引用。 */
export class DiningHistory {
    private readonly entries: DiningRecord[]

    constructor(items: readonly DiningRecord[] = []) {
        this.entries = items.map(item => this.copy(item))
    }

    save(record: DiningRecord): DiningHistory {
        const copy = this.copy(record)
        return new DiningHistory(this.entries.some(item => item.id === copy.id)
            ? this.entries.map(item => item.id === copy.id ? copy : item) : [copy, ...this.entries])
    }

    remove(id: string): DiningHistory {
        return new DiningHistory(this.entries.filter(item => item.id !== id))
    }

    get records(): DiningRecord[] {
        return this.entries.map(item => this.copy(item))
    }

    get statistics() {
        return {
            lifetimeDifference: this.entries.reduce((sum, record) => sum + cents(record.value) - cents(record.price), 0) / 100,
            totalRoundsSaved: this.entries.reduce((sum, record) => sum + record.rounds.length, 0),
            totalDishesSaved: this.entries.reduce((sum, record) => sum + record.lines.reduce((count, line) => count + line.count, 0), 0)
        }
    }

    private copy(item: DiningRecord): DiningRecord {
        return {
            id: item.id, restaurant: item.restaurant, date: item.date, price: item.price, value: item.value,
            lines: item.lines.map(line => ({name: line.name, count: line.count, price: line.price})),
            rounds: item.rounds.map(round => ({
                time: round.time, value: round.value,
                lines: round.lines.map(line => ({name: line.name, count: line.count, price: line.price}))
            }))
        }
    }
}
