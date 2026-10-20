import type {LoadHistoryInput} from '../port/in/LoadHistoryInput'
import type {RecordReader} from '../port/out/RecordReader'
import type {HistoryOutput} from '../port/out/HistoryOutput'

export class LoadHistoryInteractor implements LoadHistoryInput {
    constructor(private readonly reader: RecordReader, private readonly output: HistoryOutput) {
    }

    execute(_request: LoadHistoryInput.Request): void {
        this.output.present(this.reader.load())
    }
}
