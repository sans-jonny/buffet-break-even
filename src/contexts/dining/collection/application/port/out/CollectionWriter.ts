import type {ReceiptCollection} from '../../../model/ReceiptCollection'

export interface CollectionWriter {
    save(value: ReceiptCollection): void
}
