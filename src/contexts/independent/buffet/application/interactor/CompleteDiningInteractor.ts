import {CompleteDiningInput} from '../port/in/CompleteDiningInput'
import type {BuffetReader} from '../port/out/BuffetReader'
import type {BuffetWriter} from '../port/out/BuffetWriter'
import type {BuffetOutput} from '../port/out/BuffetOutput'
import type {CatalogGateway} from '../port/out/CatalogGateway'
import type {RoundClock} from '../port/out/RoundClock'
import type {ReceiptClock} from '../port/out/ReceiptClock'
import {commitSessionRound, createSession} from '../../domain/session'
import {buildReceipt, upsertReceipt} from '../../domain/receipts'

export class CompleteDiningInteractor implements CompleteDiningInput {
    constructor(
        private readonly reader: BuffetReader,
        private readonly writer: BuffetWriter,
        private readonly output: BuffetOutput,
        private readonly catalog: CatalogGateway,
        private readonly roundClock: RoundClock,
        private readonly receiptClock: ReceiptClock,
    ) {
    }

    execute(request: CompleteDiningInput.Request): CompleteDiningInput.Response {
        const snapshot = this.reader.load()
        const session = commitSessionRound(snapshot.session, this.catalog.products(), this.roundClock.roundTime())
        if (!session.active || !session.rounds.length) return new CompleteDiningInput.Response(false, null)
        const receipt = buildReceipt(session, this.receiptClock.receiptDate())
        const next = {
            session: createSession(), records: upsertReceipt(snapshot.records, receipt),
            receipts: request.collectReceipt ? upsertReceipt(snapshot.receipts, receipt) : snapshot.receipts
        }
        this.writer.save(next)
        this.output.present(next)
        return new CompleteDiningInput.Response(true, receipt.id)
    }
}
