import type {Product} from '@/contexts/independent/catalog/domain/Product'

export function filterProducts(catalog: readonly Product[], category: string, levels: readonly string[] = []) {
    return catalog.filter(product => (category === '我的最爱'
            ? ['beef', 'salmon', 'icecream'].includes(product.id) : product.category === category)
        && (!levels.length || levels.includes(product.level)))
}
