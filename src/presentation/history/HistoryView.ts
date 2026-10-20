import type {ReceiptViewModel} from '../receipt/ReceiptViewModel'

/** Presenter 的展示输出契约，由 UI Store 实现。 */
export interface HistoryView {
    present(viewModel: HistoryView.ViewModel): void
}

export namespace HistoryView {
    export interface ViewModel {
        records: ReceiptViewModel[];
        lifetimeDifference: number;
        totalRoundsSaved: number;
        totalDishesSaved: number
    }
}
