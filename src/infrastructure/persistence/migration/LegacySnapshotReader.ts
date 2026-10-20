import type {SnapshotDocument} from '../schema/SnapshotDocument'
import type {StoragePort} from '../storage/StoragePort'
import {decodeSession, decodeReceipt, decodeReceipts, isMissing} from '../serialization/SnapshotCodec'

/** 只读旧键，不删除旧数据；新文档存在时由存储适配器优先读取。 */
export function readLegacySnapshot(storage: StoragePort): SnapshotDocument {
    const oldSession = storage.getStorageSync('buffet-session-v2')
    const oldReceipts = storage.getStorageSync('buffet-receipts')
    const oldRecords = storage.getStorageSync('buffet-records')
    const receipts = isMissing(oldReceipts) ? [] : decodeReceipts(oldReceipts)
    return {
        session: isMissing(oldSession) ? {
            active: false, id: '', ticketPrice: 200, diningMode: '单人', restaurant: '牛牛', selected: {}, rounds: [],
        } : decodeSession(oldSession),
        receipts,
        records: isMissing(oldRecords) ? receipts.map(decodeReceipt) : decodeReceipts(oldRecords),
    }
}
