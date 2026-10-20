import type {DeleteReceiptInput} from '../port/in/DeleteReceiptInput'
import type {CollectionReader} from '../port/out/CollectionReader'
import type {CollectionWriter} from '../port/out/CollectionWriter'
import type {CollectionOutput} from '../port/out/CollectionOutput'

export class DeleteReceiptInteractor implements DeleteReceiptInput {
    constructor(private readonly reader: CollectionReader, private readonly writer: CollectionWriter, private readonly output: CollectionOutput) {
    }

    execute(request: DeleteReceiptInput.Request): void {
        const next = this.reader.load().remove(request.receiptId)
        this.writer.save(next)
        this.output.present(next)
    }
}
