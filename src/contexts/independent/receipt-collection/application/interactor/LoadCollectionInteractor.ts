import type {LoadCollectionInput} from '../port/in/LoadCollectionInput'
import type {CollectionReader} from '../port/out/CollectionReader'
import type {CollectionOutput} from '../port/out/CollectionOutput'

export class LoadCollectionInteractor implements LoadCollectionInput {
    constructor(private readonly reader: CollectionReader, private readonly output: CollectionOutput) {
    }

    execute(_request: LoadCollectionInput.Request): void {
        this.output.present(this.reader.load())
    }
}
