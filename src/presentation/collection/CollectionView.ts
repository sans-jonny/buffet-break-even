import type {ReceiptViewModel} from '../receipt/ReceiptViewModel'

/** Presenter 的展示输出契约，由 UI Store 实现。 */
export interface CollectionView {
    present(viewModel: CollectionView.ViewModel): void
}

export namespace CollectionView {
    export interface ViewModel {
        receipts: ReceiptViewModel[]
    }
}
