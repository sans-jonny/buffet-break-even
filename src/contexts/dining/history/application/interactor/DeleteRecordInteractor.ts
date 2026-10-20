import type {DeleteRecordInput} from '../port/in/DeleteRecordInput'
import type {RecordReader} from '../port/out/RecordReader'
import type {RecordWriter} from '../port/out/RecordWriter'
import type {HistoryOutput} from '../port/out/HistoryOutput'

export class DeleteRecordInteractor implements DeleteRecordInput {
    constructor(private readonly reader: RecordReader, private readonly writer: RecordWriter, private readonly output: HistoryOutput) {
    }

    execute(request: DeleteRecordInput.Request): void {
        const history = this.reader.load()
        history.remove(request.recordId)
        this.writer.save(history)
        this.output.present(history)
    }
}
