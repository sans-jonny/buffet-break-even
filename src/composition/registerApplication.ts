import type {App} from 'vue'
import type {Pinia} from 'pinia'
import {registerCatalog} from '@/contexts/independent/catalog/composition/registerCatalog'
import {registerDining} from '@/contexts/independent/dining/composition/registerDining'
import {registerHistory} from '@/contexts/independent/dining-history/composition/registerHistory'
import {registerCollection} from '@/contexts/independent/receipt-collection/composition/registerCollection'
import {registerCompleteDining} from '@/contexts/orchestration/complete-dining/composition/registerCompleteDining'
import {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import {UniSnapshotStorage} from '@/infrastructure/persistence/UniSnapshotStorage'
import {BuffetNavigation} from '@/navigation/BuffetNavigation'
import {UniBuffetNavigation} from '@/navigation/UniBuffetNavigation'

export function registerApplication(app: App, pinia: Pinia): void {
    const database = new LocalDiningDatabase(new UniSnapshotStorage(uni))
    registerCatalog(app)
    const dining = registerDining(app, pinia, database)
    const history = registerHistory(app, pinia, database)
    const collection = registerCollection(app, pinia, database)
    registerCompleteDining(app, database, dining.prepareDiningCompletion, history.saveRecord, collection.collectReceipt, dining.closeDining)
    app.provide<BuffetNavigation>(BuffetNavigation, new UniBuffetNavigation(uni, () => getCurrentPages().length))
}
