import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import type {GetCatalogInput} from '@/contexts/catalog/public'
import type {DiningViewModel} from '@/presentation/dining/DiningViewModel'
import type {HistoryViewModel} from '@/presentation/history/HistoryViewModel'
import type {CollectionViewModel} from '@/presentation/collection/CollectionViewModel'
import {createSession} from './session/infrastructure/configuration/SessionConfiguration'
import {createHistory} from './history/infrastructure/configuration/HistoryConfiguration'
import {createCollection} from './collection/infrastructure/configuration/CollectionConfiguration'
import {createCompletion} from './completion/infrastructure/configuration/CompletionConfiguration'
import {CatalogGatewayAdapter} from './session/infrastructure/integration/CatalogGatewayAdapter'

export function createDining(database: LocalDiningDatabase, catalog: GetCatalogInput, views: {
    dining: {present(view: DiningViewModel): void}
    history: {present(view: HistoryViewModel): void}
    collection: {present(view: CollectionViewModel): void}
}, appearance: (id: string) => {emoji: string; gradient: string}) {
    const afterCommit = database.afterCommit.bind(database)
    const session = createSession(database, views.dining, new CatalogGatewayAdapter(catalog), afterCommit, appearance)
    const history = createHistory(database, views.history, afterCommit)
    const collection = createCollection(database, views.collection, afterCommit)
    const completion = createCompletion(database, session.prepareDiningCompletion, history.saveRecord, collection.collectReceipt, session.closeDining)
    return {...session, ...history, ...collection, ...completion}
}
