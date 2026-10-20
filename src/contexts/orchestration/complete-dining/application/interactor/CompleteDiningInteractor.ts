import {CompleteDiningInput} from '../port/in/CompleteDiningInput'
import type {CompletionTransaction} from '../port/out/CompletionTransaction'
import {PrepareDiningCompletionInput, CloseDiningInput} from '@/contexts/independent/dining/public'
import {SaveRecordInput} from '@/contexts/independent/dining-history/public'
import {CollectReceiptInput} from '@/contexts/independent/receipt-collection/public'

export class CompleteDiningInteractor implements CompleteDiningInput {
    constructor(private readonly prepare: PrepareDiningCompletionInput, private readonly saveRecord: SaveRecordInput,
                private readonly collectReceipt: CollectReceiptInput, private readonly close: CloseDiningInput,
                private readonly transaction: CompletionTransaction) {
    }

    execute(request: CompleteDiningInput.Request): CompleteDiningInput.Response {
        return this.transaction.run(() => {
            const prepared = this.prepare.execute(new PrepareDiningCompletionInput.Request())
            if (!prepared.result) return new CompleteDiningInput.Response(false, null)
            const result = prepared.result
            this.saveRecord.execute(new SaveRecordInput.Request(this.mapResult(result)))
            if (request.collectReceipt) this.collectReceipt.execute(new CollectReceiptInput.Request(this.mapResult(result)))
            this.close.execute(new CloseDiningInput.Request(result.id))
            return new CompleteDiningInput.Response(true, result.id)
        })
    }

    private mapResult(result: NonNullable<PrepareDiningCompletionInput.Response['result']>) {
        return {
            id: result.id, restaurant: result.restaurant, date: result.date, price: result.price, value: result.value,
            lines: result.lines.map(line => ({name: line.name, count: line.count, price: line.price})),
            rounds: result.rounds.map(round => ({
                time: round.time, value: round.value,
                lines: round.lines.map(line => ({name: line.name, count: line.count, price: line.price}))
            }))
        }
    }
}
