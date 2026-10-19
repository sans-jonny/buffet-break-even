import type {App} from 'vue'
import {GetMenuInput} from '../public'
import {GetMenuInteractor} from '../application/interactor/GetMenuInteractor'
import {LocalCatalogGateway} from '../adapter/gateway/LocalCatalogGateway'

export function registerCatalog(app: App): { getMenu: GetMenuInput } {
    const getMenu = new GetMenuInteractor(new LocalCatalogGateway())
    app.provide<GetMenuInput>(GetMenuInput.Token, getMenu)
    return {getMenu}
}
