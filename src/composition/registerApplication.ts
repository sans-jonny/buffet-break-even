import type {App} from 'vue'
import type {Pinia} from 'pinia'
import {registerBuffet} from '@/contexts/independent/buffet/composition/registerBuffet'
import {registerCatalog} from '@/contexts/independent/catalog/composition/registerCatalog'
import {BuffetNavigation} from '@/navigation/BuffetNavigation'
import {UniBuffetNavigation} from '@/navigation/UniBuffetNavigation'

export function registerApplication(app: App, pinia: Pinia): void {
    registerCatalog(app)
    registerBuffet(app, pinia, uni)
    app.provide<BuffetNavigation>(BuffetNavigation, new UniBuffetNavigation(uni, () => getCurrentPages().length))
}
