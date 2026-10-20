import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import type {GetCatalogInput} from '@/contexts/catalog/public'
import type {DiningView} from '@/presentation/dining/DiningView'
import type {ProductAppearanceProvider} from '@/presentation/dining/ProductAppearanceProvider'
import type {HistoryView} from '@/presentation/history/HistoryView'
import type {CollectionView} from '@/presentation/collection/CollectionView'
import {createSession} from './session/SessionConfiguration'
import {createHistory} from './history/HistoryConfiguration'
import {createCollection} from './collection/CollectionConfiguration'
import {createCompletion} from './completion/CompletionConfiguration'
import {CatalogGatewayAdapter} from './session/infrastructure/integration/CatalogGatewayAdapter'

export function createDining(database: LocalDiningDatabase, catalog: GetCatalogInput, views: {
    dining: DiningView
    history: HistoryView
    collection: CollectionView
}, appearance: ProductAppearanceProvider) {
    const afterCommit = database.afterCommit.bind(database)
    const session = createSession(database, views.dining, new CatalogGatewayAdapter(catalog), afterCommit, appearance)
    const history = createHistory(database, views.history, afterCommit)
    const collection = createCollection(database, views.collection, afterCommit)
    const completion = createCompletion(database, session.prepareDiningCompletion, history.saveRecord, collection.collectReceipt, session.closeDining)
    return {...session, ...history, ...collection, ...completion}
}
