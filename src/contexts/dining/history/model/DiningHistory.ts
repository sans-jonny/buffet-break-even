import type {DiningRecord} from './DiningRecord'
import {cents} from '@/utils/money'

/** 本地用餐历史的聚合根，统一管理记录变更和累计统计。 */
export class DiningHistory {
    constructor(private readonly entries: DiningRecord[] = []) {
    }

    save(record: DiningRecord): void {
        const index = this.entries.findIndex(item => item.id === record.id)
        if (index === -1) this.entries.unshift(record)
        else this.entries[index] = record
    }

    remove(id: string): void {
        const index = this.entries.findIndex(item => item.id === id)
        if (index !== -1) this.entries.splice(index, 1)
    }

    get records(): readonly DiningRecord[] {
        return this.entries
    }

    get statistics() {
        let differenceInCents = 0
        let totalRoundsSaved = 0
        let totalDishesSaved = 0
        for (const record of this.entries) {
            differenceInCents += cents(record.value) - cents(record.price)
            totalRoundsSaved += record.rounds.length
            for (const line of record.lines) totalDishesSaved += line.count
        }
        return {
            lifetimeDifference: differenceInCents / 100,
            totalRoundsSaved,
            totalDishesSaved
        }
    }
}
