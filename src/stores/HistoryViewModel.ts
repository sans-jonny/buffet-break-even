import type {ReceiptViewModel} from './ReceiptViewModel'

export interface HistoryViewModel {
    records: ReceiptViewModel[];
    lifetimeDifference: number;
    totalRoundsSaved: number;
    totalDishesSaved: number
}
