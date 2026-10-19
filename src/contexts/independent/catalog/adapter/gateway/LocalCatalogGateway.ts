import type {CatalogGateway} from '../../application/port/out/CatalogGateway'
import {products, categories, diningLevels} from '@/data/catalog'

export class LocalCatalogGateway implements CatalogGateway {
    products() {
        return products.map(({id, name, category, level, price}) => ({id, name, category, level, price}))
    }

    categories() {
        return [...categories]
    }

    levels() {
        return [...diningLevels]
    }
}
