import {GetMenuInput} from '@/contexts/independent/catalog/application/port/in/GetMenuInput'
import type {CatalogGateway} from '../port/out/CatalogGateway'
import {filterProducts} from '@/contexts/independent/catalog/domain/product-filter'

export class GetMenuInteractor implements GetMenuInput {
    constructor(private readonly catalog: CatalogGateway) {
    }

    execute(request: GetMenuInput.Request): GetMenuInput.Response {
        return new GetMenuInput.Response(
            [...this.catalog.categories()], [...this.catalog.levels()],
            filterProducts(this.catalog.products(), request.category, request.levels)
                .map(product => ({
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    level: product.level,
                    price: product.price
                })))
    }
}
