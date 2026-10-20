import type {ReceiptLineView} from './ReceiptLineView'

export interface ReceiptRoundView {
    time: string;
    value: number;
    lines: ReceiptLineView[]
}
