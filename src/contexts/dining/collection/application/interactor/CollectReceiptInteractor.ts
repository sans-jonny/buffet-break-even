import type {CollectReceiptInput} from '../port/in/CollectReceiptInput'
import type {CollectionReader} from '../port/out/CollectionReader'
import type {CollectionSaver} from '../port/out/CollectionSaver'
import type {CollectionOutput} from '../port/out/CollectionOutput'

export class CollectReceiptInteractor implements CollectReceiptInput {
    constructor(private readonly reader: CollectionReader,
                private readonly saver: CollectionSaver,
                private readonly output: CollectionOutput) {
    }

    execute(request: CollectReceiptInput.Request): void {
        this.saver.save(request.receipt)
        this.output.present(this.reader.findAll())
    }
}
