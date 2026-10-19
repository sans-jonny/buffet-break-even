import type {CatalogGateway} from '@/contexts/independent/buffet/application/port/out/CatalogGateway'
import {products} from '@/data/catalog'

export class LocalCatalogGateway implements CatalogGateway {
    products() {
        return products.map(({id, name, category, level, price}) => ({id, name, category, level, price}))
    }
}
