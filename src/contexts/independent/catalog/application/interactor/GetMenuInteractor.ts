import {GetMenuInput} from '@/contexts/independent/catalog/application/port/in/GetMenuInput'
import type {CatalogGateway} from '../port/out/CatalogGateway'
import {ProductCatalog} from '../../domain/collection/ProductCatalog'

export class GetMenuInteractor implements GetMenuInput {
    constructor(private readonly catalog: CatalogGateway) {
    }

    execute(request: GetMenuInput.Request): GetMenuInput.Response {
        return new GetMenuInput.Response(
            [...this.catalog.categories()], [...this.catalog.levels()],
            new ProductCatalog(this.catalog.products()).filter(request.category, request.levels)
                .map(product => ({
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    level: product.level,
                    price: product.price
                })))
    }
}
