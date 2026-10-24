import {SaveDiningReceiptInput} from '../port/in/SaveDiningReceiptInput'
import type {CompletionTransaction} from '../port/out/CompletionTransaction'
import {PrepareDiningCompletionInput} from '@/contexts/dining/session/public'
import {CollectReceiptInput} from '@/contexts/dining/collection/public'

/** Persist a personal receipt snapshot without committing drafts, recording history or closing dining. */
export class SaveDiningReceiptInteractor implements SaveDiningReceiptInput {
    constructor(private readonly prepare: PrepareDiningCompletionInput,
                private readonly collect: CollectReceiptInput,
                private readonly transaction: CompletionTransaction) {}

    execute(request: SaveDiningReceiptInput.Request): SaveDiningReceiptInput.Response {
        return this.transaction.run(() => {
            const receipt = request.receipt || this.prepare.execute(new PrepareDiningCompletionInput.Request()).result
            if (!receipt?.lines.length) return new SaveDiningReceiptInput.Response(false, null)
            this.collect.execute(new CollectReceiptInput.Request(receipt))
            return new SaveDiningReceiptInput.Response(true, receipt.id)
        })
    }
}
