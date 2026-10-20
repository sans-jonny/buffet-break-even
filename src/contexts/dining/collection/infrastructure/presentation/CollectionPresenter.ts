import type {CollectionOutput} from '../../application/port/out/CollectionOutput'
import type {ReceiptCollection} from '../../model/ReceiptCollection'
import type {CollectionViewModel} from '@/presentation/collection/CollectionViewModel'
import type {ViewStore} from '@/presentation/shared/ViewStore'
import type {AfterCommit} from '@/infrastructure/transaction/AfterCommit'
import {toReceiptView} from '@/presentation/receipt/toReceiptView'

export class CollectionPresenter implements CollectionOutput {
    constructor(private readonly store: ViewStore<CollectionViewModel>, private readonly afterCommit: AfterCommit) {
    }

    present(value: ReceiptCollection): void {
        const view: CollectionViewModel = {receipts: value.receipts.map(item => toReceiptView(item))}
        this.afterCommit('receipt-collection', () => this.store.present(view))
    }
}
