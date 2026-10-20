import type {DiningHistory} from '../../../model/DiningHistory'

export interface RecordReader {
    load(): DiningHistory
}
