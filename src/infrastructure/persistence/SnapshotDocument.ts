import type {StoredReceipt} from './StoredReceipt'
import type {StoredSession} from './StoredSession'

export interface SnapshotDocument {
    session: StoredSession
    records: StoredReceipt[]
    receipts: StoredReceipt[]
}
