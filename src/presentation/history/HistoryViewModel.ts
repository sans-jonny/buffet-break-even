import type {ReceiptViewModel} from '../receipt/ReceiptViewModel'

export interface HistoryViewModel {
    records: ReceiptViewModel[];
    lifetimeDifference: number;
    totalRoundsSaved: number;
    totalDishesSaved: number
}
