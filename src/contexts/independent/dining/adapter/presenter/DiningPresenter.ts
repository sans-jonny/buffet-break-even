import type {DiningOutput} from '../../application/port/out/DiningOutput'
import type {CatalogGateway} from '../../application/port/out/CatalogGateway'
import type {ReceiptClock} from '../../application/port/out/ReceiptClock'
import type {DiningSession} from '../../domain/DiningSession'
import type {DiningViewModel} from '@/stores/DiningViewModel'
import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import {DiningRound} from '../../domain/value-object/DiningRound'
import {calculateBreakEven} from '@/utils/break-even'
import {toReceiptView} from '@/stores/toReceiptView'

export class DiningPresenter implements DiningOutput {
    constructor(private readonly store: { present(view: DiningViewModel): void },
                private readonly appearance: (id: string) => { emoji: string; gradient: string },
                private readonly catalog: CatalogGateway, private readonly clock: ReceiptClock,
                private readonly database: LocalDiningDatabase) {
    }

    present(session: DiningSession): void {
        const catalog = this.catalog.products()
        const selected = session.selectedLines(catalog)
        const preview = session.preview(catalog, this.clock.receiptDate())
        const view: DiningViewModel = {
            session: {
                active: session.active,
                id: session.id,
                ticketPrice: session.ticketPrice,
                diningMode: session.diningMode,
                selected: {...session.selected},
                rounds: session.rounds.map(round => ({
                    time: round.time, value: round.value,
                    lines: round.lines.map(line => ({name: line.name, count: line.count, price: line.price}))
                }))
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
            currentRoundValue: DiningRound.valueOf(selected),
            displayValue: preview.value,
            totalSelectedCount: session.selectedCount(catalog),
            breakEven: calculateBreakEven(preview.value, session.ticketPrice),
            canFinish: session.canFinish(catalog),
            previewReceipt: toReceiptView(preview),
        }
        this.database.afterCommit('dining', () => this.store.present(view))
    }
}
