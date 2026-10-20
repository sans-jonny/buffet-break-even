import {DiningHistory} from '../../model/DiningHistory'
import type {RecordReader} from '../../application/port/out/RecordReader'
import type {RecordWriter} from '../../application/port/out/RecordWriter'
import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'

export class LocalHistoryRepository implements RecordReader, RecordWriter {
    constructor(private readonly database: LocalDiningDatabase) {
    }

    load(): DiningHistory {
        return new DiningHistory(this.database.read('records'))
    }

    save(value: DiningHistory): void {
        this.database.write('records', value.records)
    }
}
