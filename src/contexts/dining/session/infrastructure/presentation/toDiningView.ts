import type {DiningSession} from '../../model/DiningSession'
import type {Product} from '../../model/snapshot/Product'
import {DiningRound} from '../../model/DiningRound'
import type {DiningViewModel} from '@/presentation/dining/DiningViewModel'
import {calculateBreakEven} from '@/utils/break-even'
import {toReceiptView} from '@/presentation/receipt/toReceiptView'

/** 纯展示投影：先生成独立快照，再由输出适配器安排发布。 */
export function toDiningView(session: DiningSession, catalog: readonly Product[], date: string,
                             appearance: (id: string) => {emoji: string; gradient: string}): DiningViewModel {
    const selected = session.selectedLines(catalog)
    const preview = session.preview(catalog, date)
    return {
        session: {
            active: session.active,
            id: session.id,
            ticketPrice: session.ticketPrice,
            diningMode: session.diningMode,
            selected: {...session.selected},
            rounds: session.rounds.map(round => ({
                time: round.time, value: round.value,
                lines: round.lines.map(line => ({name: line.name, count: line.count, price: line.price})),
            })),
        },
        selectedLines: selected.map(({product, count}) => ({
            count,
            product: {
                id: product.id, name: product.name, category: product.category,
                level: product.level, price: product.price, ...appearance(product.id),
            },
        })),
        currentRoundValue: DiningRound.valueOf(selected),
        displayValue: preview.value,
        totalSelectedCount: session.selectedCount(catalog),
        breakEven: calculateBreakEven(preview.value, session.ticketPrice),
        canFinish: session.canFinish(catalog),
        previewReceipt: toReceiptView(preview),
    }
}
