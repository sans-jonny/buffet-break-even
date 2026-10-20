import type {ProductLine} from './ProductLine'
import type {SavedRound} from './SavedRound'
import type {BreakEvenResult} from './BreakEvenResult'
import type {ReceiptViewModel} from './ReceiptViewModel'

export interface DiningViewModel {
    session: {
        active: boolean;
        id: string;
        ticketPrice: number;
        diningMode: string;
        selected: Record<string, number>;
        rounds: SavedRound[]
    }
    selectedLines: ProductLine[]
    currentRoundValue: number
    displayValue: number
    totalSelectedCount: number
    breakEven: BreakEvenResult
    canFinish: boolean
    previewReceipt: ReceiptViewModel
}
