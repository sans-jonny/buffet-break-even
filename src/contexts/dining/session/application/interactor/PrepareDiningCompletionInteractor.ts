import {PrepareDiningCompletionInput} from '../port/in/PrepareDiningCompletionInput'
import type {DiningReader} from '../port/out/DiningReader'
import type {CatalogGateway} from '../port/out/CatalogGateway'
import type {RoundClock} from '../port/out/RoundClock'
import type {ReceiptClock} from '../port/out/ReceiptClock'

export class PrepareDiningCompletionInteractor implements PrepareDiningCompletionInput {
    constructor(private readonly reader: DiningReader, private readonly catalog: CatalogGateway,
                private readonly roundClock: RoundClock, private readonly receiptClock: ReceiptClock) {
    }

    execute(_request: PrepareDiningCompletionInput.Request): PrepareDiningCompletionInput.Response {
        const result = this.reader.load().prepareCompletion(this.catalog.products(), this.roundClock.roundTime(), this.receiptClock.receiptDate())
        if (!result) return new PrepareDiningCompletionInput.Response(null)
        return new PrepareDiningCompletionInput.Response(result.toSnapshot())
    }
}
