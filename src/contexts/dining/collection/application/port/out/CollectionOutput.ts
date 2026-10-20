import type {ReceiptCollection} from '../../../model/ReceiptCollection'

export interface CollectionOutput {
    present(value: ReceiptCollection): void
}
