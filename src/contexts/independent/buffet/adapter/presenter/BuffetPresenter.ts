import type {CatalogGateway} from '../../application/port/out/CatalogGateway'
import type {ReceiptClock} from '../../application/port/out/ReceiptClock'
import {buildReceipt} from '../../domain/receipts'
import type {BuffetOutput} from '@/contexts/independent/buffet/application/port/out/BuffetOutput'
import type {BuffetSnapshot} from '@/contexts/independent/buffet/domain/BuffetSnapshot'
import type {Receipt} from '@/contexts/independent/buffet/domain/Receipt'
import type {SavedRound} from '@/contexts/independent/buffet/domain/SavedRound'
import {calculateBreakEven} from '@/contexts/independent/buffet/domain/break-even'
import {getSelectedCount, getSelectedLines} from '@/contexts/independent/buffet/domain/selection'
import {getRoundValue} from '@/contexts/independent/buffet/domain/rounds'
import {getRecordStats} from '@/contexts/independent/buffet/domain/receipts'
import type {BuffetViewModel} from '@/stores/BuffetViewModel'
import type {ReceiptViewModel} from '@/stores/ReceiptViewModel'
import type {ProductAppearance} from './ProductAppearance'

export class BuffetPresenter implements BuffetOutput {
    constructor(private readonly store: { present(view: BuffetViewModel): void },
                private readonly appearance: (id: string) => ProductAppearance,
                private readonly catalog: CatalogGateway, private readonly clock: ReceiptClock) {
    }

    private rounds(rounds: readonly SavedRound[]) {
        return rounds.map(round => ({
            time: round.time, value: round.value,
            lines: round.lines.map(line => ({name: line.name, count: line.count, price: line.price}))
        }))
    }

    private receipt(receipt: Receipt): ReceiptViewModel {
        return {
            id: receipt.id,
            restaurant: receipt.restaurant,
            date: receipt.date,
            price: receipt.price,
            value: receipt.value,
            lines: receipt.lines.map(line => ({name: line.name, count: line.count, price: line.price})),
            rounds: this.rounds(receipt.rounds),
            dishCount: receipt.lines.reduce((count, line) => count + line.count, 0),
            result: {...calculateBreakEven(receipt.value, receipt.price)}
        }
    }

    present(snapshot: BuffetSnapshot): void {
        const catalog = this.catalog.products()
        const preview = buildReceipt(snapshot.session, this.clock.receiptDate(), getSelectedLines(catalog, snapshot.session.selected))
        const {session} = snapshot
        const selected = getSelectedLines(catalog, session.selected)
        this.store.present({
            session: {
                active: session.active,
                id: session.id,
                ticketPrice: session.ticketPrice,
                diningMode: session.diningMode,
                selected: {...session.selected},
                rounds: this.rounds(session.rounds)
            },
            selectedLines: selected.map(({product, count}) => ({
                count, product: {
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    level: product.level,
                    price: product.price, ...this.appearance(product.id)
                }
            })),
            currentRoundValue: getRoundValue(selected),
            displayValue: preview.value,
            totalSelectedCount: getSelectedCount(selected),
            breakEven: {...calculateBreakEven(preview.value, session.ticketPrice)},
            canFinish: session.active && (session.rounds.length > 0 || selected.length > 0),
            previewReceipt: this.receipt(preview),
            records: snapshot.records.map(record => this.receipt(record)),
            receipts: snapshot.receipts.map(receipt => this.receipt(receipt)), ...getRecordStats(snapshot.records)
        })
    }
}
