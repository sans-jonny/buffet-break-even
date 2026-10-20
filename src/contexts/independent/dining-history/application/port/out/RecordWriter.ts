import type {DiningHistory} from '../../../domain/collection/DiningHistory'

export interface RecordWriter {
    save(value: DiningHistory): void
}
