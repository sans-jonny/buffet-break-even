import type {Product} from '../entity/Product'

/** 目录领域集合，提供筛选行为，不具有独立于菜品的业务身份。 */
export class ProductCatalog {
    private readonly products: Product[]

    constructor(products: readonly Product[]) {
        this.products = products.map(product => ({...product}))
    }

    filter(category: string, levels: readonly string[] = []): Product[] {
        return this.products.filter(product => (category === '我的最爱'
                ? ['beef', 'salmon', 'icecream'].includes(product.id) : product.category === category)
            && (!levels.length || levels.includes(product.level))).map(product => ({...product}))
    }
}
