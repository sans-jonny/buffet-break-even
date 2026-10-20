import type {CollectedReceipt} from '../entity/CollectedReceipt'

/** 无独立业务标识的领域集合，管理收藏实体并隔离外部引用。 */
export class ReceiptCollection {
    private readonly entries: CollectedReceipt[]

    constructor(items: readonly CollectedReceipt[] = []) {
        this.entries = items.map(item => this.copy(item))
    }

    collect(receipt: CollectedReceipt): ReceiptCollection {
        const copy = this.copy(receipt)
        return new ReceiptCollection(this.entries.some(item => item.id === copy.id)
            ? this.entries.map(item => item.id === copy.id ? copy : item) : [copy, ...this.entries])
    }

    remove(id: string): ReceiptCollection {
        return new ReceiptCollection(this.entries.filter(item => item.id !== id))
    }

    get receipts(): CollectedReceipt[] {
        return this.entries.map(item => this.copy(item))
    }

    private copy(item: CollectedReceipt): CollectedReceipt {
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
