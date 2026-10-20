import {GetCatalogInput} from '../port/in/GetCatalogInput'
import type {CatalogGateway} from '../port/out/CatalogGateway'

/** 跨上下文需要完整菜品快照，与页面筛选菜单的查询分开。 */
export class GetCatalogInteractor implements GetCatalogInput {
    constructor(private readonly catalog: CatalogGateway) {}

    execute(_request: GetCatalogInput.Request): GetCatalogInput.Response {
        return new GetCatalogInput.Response(this.catalog.products().map(({id, name, category, level, price}) =>
            ({id, name, category, level, price})))
    }
}
