import type {ReceiptCollection} from '../../../domain/collection/ReceiptCollection'

export interface CollectionReader {
    load(): ReceiptCollection
}
