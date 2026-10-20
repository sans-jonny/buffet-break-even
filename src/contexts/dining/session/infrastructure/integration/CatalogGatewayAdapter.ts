import {GetCatalogInput} from '@/contexts/catalog/public'
import type {CatalogGateway} from '../../application/port/out/CatalogGateway'

export class CatalogGatewayAdapter implements CatalogGateway {
    constructor(private readonly catalog: GetCatalogInput) {}

    products() {
        return this.catalog.execute(new GetCatalogInput.Request()).products
            .map(({id, name, category, level, price}) => ({id, name, category, level, price}))
    }
}
