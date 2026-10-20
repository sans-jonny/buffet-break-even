import type {SnapshotPersistence} from '../SnapshotPersistence'
import type {SnapshotDocument} from '../schema/SnapshotDocument'
import type {StoragePort} from './StoragePort'
import {decodeSnapshot, encodeSnapshot, isMissing} from '../serialization/SnapshotCodec'
import {readLegacySnapshot} from '../migration/LegacySnapshotReader'

export const SNAPSHOT_KEY = 'buffet-state-v3'

/** 单键读写保持不变；格式校验与旧键读取各自独立。 */
export class UniSnapshotStorage implements SnapshotPersistence {
    constructor(private readonly storage: StoragePort) {}

    load(): SnapshotDocument {
        try {
            const saved = this.storage.getStorageSync(SNAPSHOT_KEY)
            return isMissing(saved) ? readLegacySnapshot(this.storage) : decodeSnapshot(saved)
        } catch {
            throw new Error('读取用餐数据失败，请重试；原有记录已保留')
        }
    }

    save(snapshot: SnapshotDocument): void {
        try {
            this.storage.setStorageSync(SNAPSHOT_KEY, encodeSnapshot(snapshot))
        } catch {
            throw new Error('保存失败，请检查存储空间后重试')
        }
    }
}
