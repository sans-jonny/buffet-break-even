import type {CollectedReceipt} from '../../model/CollectedReceipt'
import type {CollectionReader} from '../../application/port/out/CollectionReader'
import type {CollectionSaver} from '../../application/port/out/CollectionSaver'
import type {CollectionDeleter} from '../../application/port/out/CollectionDeleter'
import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'

export class LocalCollectionRepository implements CollectionReader, CollectionSaver, CollectionDeleter {
    constructor(private readonly database: LocalDiningDatabase) {
    }

    findAll(): CollectedReceipt[] {
        return this.database.read('receipts')
    }

    save(receipt: CollectedReceipt): void {
        const receipts = this.findAll()
        const index = receipts.findIndex(item => item.id === receipt.id)
        const stored = {
            id: receipt.id, restaurant: receipt.restaurant, date: receipt.date, price: receipt.price, value: receipt.value,
            lines: receipt.lines.map(({name, count, price}) => ({name, count, price})),
            rounds: receipt.rounds.map(({time, value, lines}) => ({
                time, value, lines: lines.map(({name, count, price}) => ({name, count, price}))
            }))
        }
        if (index === -1) receipts.unshift(stored)
        else receipts[index] = stored
        this.database.write('receipts', receipts)
    }

    delete(id: string): void {
        this.database.write('receipts', this.findAll().filter(receipt => receipt.id !== id))
    }
}
