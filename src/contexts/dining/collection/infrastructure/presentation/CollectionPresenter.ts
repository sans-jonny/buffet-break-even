import type {CollectionOutput} from '../../application/port/out/CollectionOutput'
import type {CollectedReceipt} from '../../model/CollectedReceipt'
import type {CollectionView} from '@/presentation/collection/CollectionView'
import type {AfterCommit} from '@/infrastructure/transaction/AfterCommit'
import {toReceiptView} from '@/presentation/receipt/toReceiptView'

export class CollectionPresenter implements CollectionOutput {
    constructor(private readonly view: CollectionView, private readonly afterCommit: AfterCommit) {
    }

    present(receipts: readonly CollectedReceipt[]): void {
        const viewModel: CollectionView.ViewModel = {receipts: receipts.map(toReceiptView)}
        this.afterCommit('receipt-collection', () => this.view.present(viewModel))
    }
}
