import type {ReceiptLineView} from './ReceiptLineView'
import type {ReceiptRoundView} from './ReceiptRoundView'
import type {BreakEvenView} from '../shared/BreakEvenView'

export interface ReceiptViewModel {
    id: string;
    restaurant: string;
    date: string;
    price: number;
    value: number
    lines: ReceiptLineView[];
    rounds: ReceiptRoundView[];
    dishCount: number;
    result: BreakEvenView
}
