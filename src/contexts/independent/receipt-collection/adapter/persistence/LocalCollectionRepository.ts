import {ReceiptCollection} from '../../domain/collection/ReceiptCollection'
import type {CollectionReader} from '../../application/port/out/CollectionReader'
import type {CollectionWriter} from '../../application/port/out/CollectionWriter'
import type {CollectedReceipt} from '../../domain/entity/CollectedReceipt'
import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'

export class LocalCollectionRepository implements CollectionReader, CollectionWriter {
    constructor(private readonly database: LocalDiningDatabase) {
    }

    load(): ReceiptCollection {
        return new ReceiptCollection(this.database.read('receipts').map(item => this.map(item)))
    }

    save(value: ReceiptCollection): void {
        this.database.write('receipts', value.receipts.map(item => this.map(item)))
    }

    private map(item: CollectedReceipt): CollectedReceipt {
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
