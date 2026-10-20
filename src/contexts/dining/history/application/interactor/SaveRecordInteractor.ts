import type {SaveRecordInput} from '../port/in/SaveRecordInput'
import type {RecordReader} from '../port/out/RecordReader'
import type {RecordWriter} from '../port/out/RecordWriter'
import type {HistoryOutput} from '../port/out/HistoryOutput'

export class SaveRecordInteractor implements SaveRecordInput {
    constructor(private readonly reader: RecordReader, private readonly writer: RecordWriter, private readonly output: HistoryOutput) {
    }

    execute(request: SaveRecordInput.Request): void {
        const history = this.reader.load()
        history.save(request.record)
        this.writer.save(history)
        this.output.present(history)
    }
}
