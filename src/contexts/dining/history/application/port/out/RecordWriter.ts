import type {DiningHistory} from '../../../model/DiningHistory'

export interface RecordWriter {
    save(value: DiningHistory): void
}
