import type {DiningHistory} from '../../../domain/collection/DiningHistory'

export interface RecordReader {
    load(): DiningHistory
}
