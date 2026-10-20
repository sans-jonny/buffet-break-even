import {GetMenuInteractor} from '../../application/interactor/GetMenuInteractor'
import {GetCatalogInteractor} from '../../application/interactor/GetCatalogInteractor'
import {StaticCatalogGateway} from '../data/StaticCatalogGateway'

export function createCatalog() {
    const catalog = new StaticCatalogGateway()
    return {getMenu: new GetMenuInteractor(catalog), getCatalog: new GetCatalogInteractor(catalog)}
}
