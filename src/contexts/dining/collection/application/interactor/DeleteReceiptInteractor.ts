import type {DeleteReceiptInput} from '../port/in/DeleteReceiptInput'
import type {CollectionReader} from '../port/out/CollectionReader'
import type {CollectionDeleter} from '../port/out/CollectionDeleter'
import type {CollectionOutput} from '../port/out/CollectionOutput'

export class DeleteReceiptInteractor implements DeleteReceiptInput {
    constructor(private readonly reader: CollectionReader, private readonly deleter: CollectionDeleter, private readonly output: CollectionOutput) {
    }

    execute(request: DeleteReceiptInput.Request): void {
        this.deleter.delete(request.receiptId)
        this.output.present(this.reader.findAll())
    }
}
