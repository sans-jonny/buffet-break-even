import type {CollectReceiptInput} from '../port/in/CollectReceiptInput'
import type {CollectionReader} from '../port/out/CollectionReader'
import type {CollectionWriter} from '../port/out/CollectionWriter'
import type {CollectionOutput} from '../port/out/CollectionOutput'
import type {CollectedReceipt} from '../../model/CollectedReceipt'

export class CollectReceiptInteractor implements CollectReceiptInput {
    constructor(private readonly reader: CollectionReader, private readonly writer: CollectionWriter, private readonly output: CollectionOutput) {
    }

    execute(request: CollectReceiptInput.Request): void {
        const value = request.receipt
        const item: CollectedReceipt = {
            id: value.id, restaurant: value.restaurant, date: value.date, price: value.price, value: value.value,
            lines: value.lines.map(line => ({name: line.name, count: line.count, price: line.price})),
            rounds: value.rounds.map(round => ({
                time: round.time, value: round.value,
                lines: round.lines.map(line => ({name: line.name, count: line.count, price: line.price}))
            }))
        }
        const next = this.reader.load().collect(item)
        this.writer.save(next)
        this.output.present(next)
    }
}
