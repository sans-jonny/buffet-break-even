import type {ReceiptCollection} from '../../../domain/collection/ReceiptCollection'

export interface CollectionWriter {
    save(value: ReceiptCollection): void
}
