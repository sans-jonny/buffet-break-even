import type {DiningCatalog} from '@/utils/restaurant-catalog'
import type {RoomSnapshot} from '@/utils/room-protocol'
import type {DiningView} from './DiningView'
import type {ProductView} from './ProductView'
import {toReceiptView} from '@/presentation/receipt/toReceiptView'
import {calculateBreakEven} from '@/utils/break-even'

/** Project the shared room into the same read model used by single dining pages. */
export function toRoomDiningView(room: RoomSnapshot, products: readonly ProductView[], date: string, catalog?: DiningCatalog, restaurantId?: string): DiningView.ViewModel {
    restaurantId = room.receipt?.restaurantId || restaurantId || catalog?.restaurants[0]?.id
    const restaurant = catalog?.restaurants.find(r => r.id === restaurantId)
    const draft = room.drafts[restaurantId || ''] || {selected: {}, rounds: []}
    const selectedLines = products.filter(product => draft.selected[product.id] > 0)
        .map(product => ({product: {...product}, count: draft.selected[product.id]}))
    const currentRoundValue = selectedLines.reduce((sum, line) => sum + Math.round(line.product.price * 100) * line.count, 0) / 100
    const value = (draft.rounds.reduce((sum, round) => sum + Math.round(round.value * 100), 0) + Math.round(currentRoundValue * 100)) / 100
    const merged = new Map<string, {name: string; count: number; price: number}>()
    const add = (line: {name: string; count: number; price: number}) => {
        const previous = merged.get(line.name)
        if (previous) previous.count += line.count; else merged.set(line.name, {...line})
    }
    draft.rounds.forEach(round => round.lines.forEach(add))
    selectedLines.forEach(line => add({name: line.product.name, count: line.count, price: line.product.price}))
    const preview = room.receipt || {id: room.id, restaurant: restaurant?.name || '旧版菜单', restaurantId, typeId: catalog?.typeId, typeName: catalog?.typeName, date, price: room.ticketPrice, value,
        participants: room.members.map(member => member.nickname),
        lines: [...merged.values()], rounds: [...draft.rounds, ...(selectedLines.length ? [{time:date, value:currentRoundValue,
            lines:selectedLines.map(line=>({name:line.product.name,count:line.count,price:line.product.price}))}] : [])]}
    return {
        session: {catalog, restaurantId, hasAnyDraft: Object.values(room.drafts).some(d => d.rounds.length || Object.keys(d.selected).length), active: room.status === 'active', id: room.id, ticketPrice: room.ticketPrice, diningMode: '多人',
            selected: {...draft.selected}, rounds: draft.rounds.map(round => ({...round, lines: round.lines.map(line => ({...line}))}))},
        selectedLines, currentRoundValue, displayValue: preview.value, totalSelectedCount: selectedLines.reduce((sum, line) => sum + line.count, 0),
        breakEven: calculateBreakEven(preview.value, room.ticketPrice), canFinish: Boolean(room.receipt || draft.rounds.length || selectedLines.length),
        previewReceipt: toReceiptView(preview),
    }
}
