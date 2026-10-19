import type {DiningSession} from '@/contexts/independent/buffet/domain/DiningSession'
import type {Product} from '@/contexts/independent/buffet/domain/Product'
import type {ProductLine} from '@/contexts/independent/buffet/domain/ProductLine'

export function changeSelection(selected: DiningSession['selected'], productId: string, change: 1 | -1) {
    if (change !== 1 && change !== -1) throw new Error('数量变化无效')
    const next = {...selected}
    const count = (Object.prototype.hasOwnProperty.call(next, productId) ? next[productId] : 0) + change
    if (!Number.isSafeInteger(count)) throw new Error('数量超出支持范围')
    if (count <= 0) delete next[productId]
    else Object.defineProperty(next, productId, {value: count, enumerable: true, writable: true, configurable: true})
    return next
}

export function getSelectedLines(catalog: readonly Product[], selected: DiningSession['selected']): ProductLine[] {
    return catalog.filter(product => Object.prototype.hasOwnProperty.call(selected, product.id)
        && Number.isSafeInteger(selected[product.id]) && selected[product.id] > 0)
        .map(product => ({product: {...product}, count: selected[product.id]}))
}

export function getSelectedCount(lines: readonly ProductLine[]) {
    return lines.reduce((sum, line) => sum + line.count, 0)
}
