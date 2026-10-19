import type {DeleteReceiptInput} from '../port/in/DeleteReceiptInput'
import type {BuffetReader} from '../port/out/BuffetReader'
import type {BuffetWriter} from '../port/out/BuffetWriter'
import type {BuffetOutput} from '../port/out/BuffetOutput'

export class DeleteReceiptInteractor implements DeleteReceiptInput {
    constructor(
        private readonly reader: BuffetReader,
        private readonly writer: BuffetWriter,
        private readonly output: BuffetOutput,
    ) {
    }

    execute(request: DeleteReceiptInput.Request): void {
        const snapshot = this.reader.load()
        const next = {...snapshot, receipts: snapshot.receipts.filter(receipt => receipt.id !== request.receiptId)}
        this.writer.save(next)
        this.output.present(next)
    }
}
