import type {CollectedReceipt} from '../../../model/CollectedReceipt'

export interface CollectionSaver {
    /** 同 ID 原位更新；新收藏置顶。 */
    save(receipt: CollectedReceipt): void
}
