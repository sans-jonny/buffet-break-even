import type {App} from 'vue'
import type {Pinia} from 'pinia'
import {createCatalog} from '@/contexts/catalog/infrastructure/configuration/CatalogConfiguration'
import {createDining} from '@/contexts/dining/DiningConfiguration'
import {GetMenuInput, GetCatalogInput} from '@/contexts/catalog/public'
import {LoadDiningInput, BeginSessionInput, ChangeSelectionInput, CommitRoundInput,
    LoadHistoryInput, DeleteRecordInput, LoadCollectionInput, DeleteReceiptInput, CompleteDiningInput} from '@/contexts/dining/public'
import {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import {UniSnapshotStorage} from '@/infrastructure/persistence/storage/UniSnapshotStorage'
import {useDiningStore} from '@/stores/useDiningStore'
import {useHistoryStore} from '@/stores/useHistoryStore'
import {useCollectionStore} from '@/stores/useCollectionStore'
import {useApplicationStore} from '@/stores/useApplicationStore'
import {productAppearance} from '@/presentation/dining/productAppearance'
import {BuffetNavigation} from '@/navigation/BuffetNavigation'
import {UniBuffetNavigation} from '@/navigation/UniBuffetNavigation'
import {ApplicationBootstrap} from './ApplicationBootstrap'

export function registerApplication(app: App, pinia: Pinia): void {
    const database = new LocalDiningDatabase(new UniSnapshotStorage(uni))
    const catalog = createCatalog()
    const dining = createDining(database, catalog.getCatalog, {
        dining: useDiningStore(pinia), history: useHistoryStore(pinia), collection: useCollectionStore(pinia),
    }, productAppearance)
    app.provide<GetMenuInput>(GetMenuInput.Token, catalog.getMenu)
    app.provide<GetCatalogInput>(GetCatalogInput.Token, catalog.getCatalog)
    app.provide<LoadDiningInput>(LoadDiningInput.Token, dining.loadDining)
    app.provide<BeginSessionInput>(BeginSessionInput.Token, dining.beginSession)
    app.provide<ChangeSelectionInput>(ChangeSelectionInput.Token, dining.changeSelection)
    app.provide<CommitRoundInput>(CommitRoundInput.Token, dining.commitRound)
    app.provide<LoadHistoryInput>(LoadHistoryInput.Token, dining.loadHistory)
    app.provide<DeleteRecordInput>(DeleteRecordInput.Token, dining.deleteRecord)
    app.provide<LoadCollectionInput>(LoadCollectionInput.Token, dining.loadCollection)
    app.provide<DeleteReceiptInput>(DeleteReceiptInput.Token, dining.deleteReceipt)
    app.provide<CompleteDiningInput>(CompleteDiningInput.Token, dining.completeDining)
    app.provide(ApplicationBootstrap.Token, new ApplicationBootstrap({
        dining: dining.loadDining, history: dining.loadHistory, collection: dining.loadCollection,
    }, database.transaction.bind(database), useApplicationStore(pinia)))
    app.provide<BuffetNavigation>(BuffetNavigation, new UniBuffetNavigation(uni, () => getCurrentPages().length))
}
