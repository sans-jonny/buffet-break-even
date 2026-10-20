import type {LoadDiningInput} from '../port/in/LoadDiningInput'
import type {DiningReader} from '../port/out/DiningReader'
import type {DiningOutput} from '../port/out/DiningOutput'

export class LoadDiningInteractor implements LoadDiningInput {
    constructor(
        private readonly reader: DiningReader,
        private readonly output: DiningOutput,
    ) {
    }

    execute(_request: LoadDiningInput.Request): void {
        this.output.present(this.reader.load())
    }
}
