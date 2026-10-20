import type {CollectedReceipt} from '../../../model/CollectedReceipt'

export interface CollectionReader {
    /** 返回独立快照，按收藏顺序排列。 */
    findAll(): CollectedReceipt[]
}
