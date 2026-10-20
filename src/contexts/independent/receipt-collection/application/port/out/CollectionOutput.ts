import type {ReceiptCollection} from '../../../domain/collection/ReceiptCollection'

export interface CollectionOutput {
    present(value: ReceiptCollection): void
}
