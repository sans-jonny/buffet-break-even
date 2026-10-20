import type {Product} from './snapshot/Product'
import type {ProductLine} from './snapshot/ProductLine'

/** 待选数量值对象。变更返回新对象，不允许通过引用修改数量。 */
export class DiningSelection {
    private readonly quantities: Record<string, number>

    constructor(selected: Readonly<Record<string, number>> = {}) {
        this.quantities = {...selected}
    }

    change(productId: string, change: 1 | -1): DiningSelection {
        if (change !== 1 && change !== -1) throw new Error('数量变化无效')
        const next = this.toSnapshot()
        const count = (Object.prototype.hasOwnProperty.call(next, productId) ? next[productId] : 0) + change
        if (!Number.isSafeInteger(count)) throw new Error('数量超出支持范围')
        if (count <= 0) delete next[productId]
        else Object.defineProperty(next, productId, {
            value: count,
            enumerable: true,
            writable: true,
            configurable: true
        })
        return new DiningSelection(next)
    }

    resolve(catalog: readonly Product[]): ProductLine[] {
        return catalog.filter(product => Object.prototype.hasOwnProperty.call(this.quantities, product.id)
            && Number.isSafeInteger(this.quantities[product.id]) && this.quantities[product.id] > 0)
            .map(product => ({product: {...product}, count: this.quantities[product.id]}))
    }

    count(catalog: readonly Product[]): number {
        return this.resolve(catalog).reduce((sum, line) => sum + line.count, 0)
    }

    toSnapshot(): Record<string, number> {
        return {...this.quantities}
    }
}
