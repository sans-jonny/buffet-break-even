import {DiningHistory} from '../../domain/collection/DiningHistory'
import type {RecordReader} from '../../application/port/out/RecordReader'
import type {RecordWriter} from '../../application/port/out/RecordWriter'
import type {DiningRecord} from '../../domain/entity/DiningRecord'
import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'

export class LocalHistoryRepository implements RecordReader, RecordWriter {
    constructor(private readonly database: LocalDiningDatabase) {
    }

    load(): DiningHistory {
        return new DiningHistory(this.database.read('records').map(item => this.map(item)))
    }

    save(value: DiningHistory): void {
        this.database.write('records', value.records.map(item => this.map(item)))
    }

    private map(item: DiningRecord): DiningRecord {
        return {
            id: item.id, restaurant: item.restaurant, date: item.date, price: item.price, value: item.value,
            lines: item.lines.map(line => ({name: line.name, count: line.count, price: line.price})),
            rounds: item.rounds.map(round => ({
                time: round.time, value: round.value,
                lines: round.lines.map(line => ({name: line.name, count: line.count, price: line.price}))
            }))
        }
    }
}
