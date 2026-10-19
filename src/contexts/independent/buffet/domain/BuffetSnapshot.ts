import type {Receipt} from './Receipt'
import type {DiningSession} from './DiningSession'

export interface BuffetSnapshot {
    session: DiningSession
    records: Receipt[]
    receipts: Receipt[]
}
