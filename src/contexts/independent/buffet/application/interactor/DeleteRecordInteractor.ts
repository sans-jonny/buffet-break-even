import type {DeleteRecordInput} from '../port/in/DeleteRecordInput'
import type {BuffetReader} from '../port/out/BuffetReader'
import type {BuffetWriter} from '../port/out/BuffetWriter'
import type {BuffetOutput} from '../port/out/BuffetOutput'

export class DeleteRecordInteractor implements DeleteRecordInput {
    constructor(
        private readonly reader: BuffetReader,
        private readonly writer: BuffetWriter,
        private readonly output: BuffetOutput,
    ) {
    }

    execute(request: DeleteRecordInput.Request): void {
        const snapshot = this.reader.load()
        const next = {...snapshot, records: snapshot.records.filter(record => record.id !== request.recordId)}
        this.writer.save(next)
        this.output.present(next)
    }
}
