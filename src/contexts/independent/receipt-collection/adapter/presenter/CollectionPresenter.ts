import type {CollectionOutput} from '../../application/port/out/CollectionOutput'
import type {ReceiptCollection} from '../../domain/collection/ReceiptCollection'
import type {CollectionViewModel} from '@/stores/CollectionViewModel'
import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import {toReceiptView} from '@/stores/toReceiptView'

export class CollectionPresenter implements CollectionOutput {
    constructor(private readonly store: {
        present(view: CollectionViewModel): void
    }, private readonly database: LocalDiningDatabase) {
    }

    present(value: ReceiptCollection): void {
        const view: CollectionViewModel = {receipts: value.receipts.map(item => toReceiptView(item))}
        this.database.afterCommit('receipt-collection', () => this.store.present(view))
    }
}
