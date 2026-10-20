import type {CollectedReceipt} from '../../../model/CollectedReceipt'

export interface CollectionOutput {
    present(receipts: readonly CollectedReceipt[]): void
}
