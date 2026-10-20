import type {ReceiptCollection} from '../../../model/ReceiptCollection'

export interface CollectionReader {
    load(): ReceiptCollection
}
