import type {ProductLineView} from './ProductLineView'
import type {ReceiptRoundView} from '../receipt/ReceiptRoundView'
import type {BreakEvenView} from '../shared/BreakEvenView'
import type {ReceiptViewModel} from '../receipt/ReceiptViewModel'

/** Presenter 的展示输出契约，由 UI Store 实现。 */
export interface DiningView {
    present(viewModel: DiningView.ViewModel): void
}

export namespace DiningView {
    export interface ViewModel {
        session: {
            active: boolean;
            id: string;
            ticketPrice: number;
            diningMode: string;
            selected: Record<string, number>;
            rounds: ReceiptRoundView[]
        }
        selectedLines: ProductLineView[]
        currentRoundValue: number
        displayValue: number
        totalSelectedCount: number
        breakEven: BreakEvenView
        canFinish: boolean
        previewReceipt: ReceiptViewModel
    }
}
