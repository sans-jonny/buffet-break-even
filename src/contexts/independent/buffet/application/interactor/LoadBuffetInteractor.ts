import type {LoadBuffetInput} from '../port/in/LoadBuffetInput'
import type {BuffetReader} from '../port/out/BuffetReader'
import type {BuffetOutput} from '../port/out/BuffetOutput'

export class LoadBuffetInteractor implements LoadBuffetInput {
    constructor(
        private readonly reader: BuffetReader,
        private readonly output: BuffetOutput,
    ) {
    }

    execute(_request: LoadBuffetInput.Request): void {
        this.output.present(this.reader.load())
    }
}
