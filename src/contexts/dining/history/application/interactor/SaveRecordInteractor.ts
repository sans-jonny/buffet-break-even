import type {SaveRecordInput} from '../port/in/SaveRecordInput'
import type {RecordReader} from '../port/out/RecordReader'
import type {RecordWriter} from '../port/out/RecordWriter'
import type {HistoryOutput} from '../port/out/HistoryOutput'
import type {DiningRecord} from '../../model/DiningRecord'

export class SaveRecordInteractor implements SaveRecordInput {
    constructor(private readonly reader: RecordReader, private readonly writer: RecordWriter, private readonly output: HistoryOutput) {
    }

    execute(request: SaveRecordInput.Request): void {
        const value = request.record
        const item: DiningRecord = {
            id: value.id, restaurant: value.restaurant, date: value.date, price: value.price, value: value.value,
            lines: value.lines.map(line => ({name: line.name, count: line.count, price: line.price})),
            rounds: value.rounds.map(round => ({
                time: round.time, value: round.value,
                lines: round.lines.map(line => ({name: line.name, count: line.count, price: line.price}))
            }))
        }
        const next = this.reader.load().save(item)
        this.writer.save(next)
        this.output.present(next)
    }
}
