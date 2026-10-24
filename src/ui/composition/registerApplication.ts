import {SelectRestaurantInput} from '@/contexts/dining/public'
import {EditCatalogInput} from '@/contexts/catalog/public'
import type {App} from 'vue'
import type {Pinia} from 'pinia'
import {createCatalog} from '@/contexts/catalog/CatalogConfiguration'
import {createDining} from '@/contexts/dining/DiningConfiguration'
import {GetMenuInput, GetCatalogInput} from '@/contexts/catalog/public'
import {LoadDiningInput, BeginSessionInput, ChangeSelectionInput, CommitRoundInput,
    LoadHistoryInput, DeleteRecordInput, LoadCollectionInput, DeleteReceiptInput, CompleteDiningInput} from '@/contexts/dining/public'
import {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import {UniSnapshotStorage} from '@/infrastructure/persistence/storage/UniSnapshotStorage'
import {useDiningStore} from '@/ui/stores/useDiningStore'
import {useHistoryStore} from '@/ui/stores/useHistoryStore'
import {useCollectionStore} from '@/ui/stores/useCollectionStore'
import {useApplicationStore} from '@/ui/stores/useApplicationStore'
import {productAppearance} from '@/presentation/dining/productAppearance'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {UniBuffetNavigation} from '@/ui/navigation/UniBuffetNavigation'
import {ApplicationBootstrap} from './ApplicationBootstrap'
import {RoomInput, SaveRoomResultInput, SaveDiningReceiptInput, DiscardSessionInput, ChangeTicketPriceInput} from '@/contexts/dining/public'
import {createRoom} from '@/contexts/dining/room/RoomConfiguration'
import {useRoomStore} from '@/ui/stores/useRoomStore'
import {useProfileStore} from '@/ui/stores/useProfileStore'
import {ProfileSettings} from '@/ui/profile/ProfileSettings'
import {UniProfileSettings} from '@/ui/profile/UniProfileSettings'
import {MenuPreviewCache} from '@/ui/preview/MenuPreviewCache'
import {UniUserIdentity} from '@/infrastructure/identity/UniUserIdentity'

export function registerApplication(app: App, pinia: Pinia): void {
    app.provide<MenuPreviewCache>(MenuPreviewCache.Token, new MenuPreviewCache(uni))
    const database = new LocalDiningDatabase(new UniSnapshotStorage(uni))
    const catalog = createCatalog()
    const dining = createDining(database, catalog.getCatalog, {
        dining: useDiningStore(pinia), history: useHistoryStore(pinia), collection: useCollectionStore(pinia),
    }, productAppearance)
    app.provide<SelectRestaurantInput>(SelectRestaurantInput.Token, dining.selectRestaurant)
    app.provide<EditCatalogInput>(EditCatalogInput.Token, catalog.editCatalog)
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
    app.provide<SaveDiningReceiptInput>(SaveDiningReceiptInput.Token, dining.saveDiningReceipt)
    app.provide<SaveRoomResultInput>(SaveRoomResultInput.Token, dining.saveRoomResult)
    app.provide<DiscardSessionInput>(DiscardSessionInput.Token, dining.closeDining)
    app.provide<ChangeTicketPriceInput>(ChangeTicketPriceInput.Token, dining.changeTicketPrice)
    app.provide<RoomInput>(RoomInput.Token, createRoom(useRoomStore(pinia), dining.saveRoomResult, catalog.getCatalog, productAppearance))
    const profile = new UniProfileSettings(useProfileStore(pinia))
    app.provide<ProfileSettings>(ProfileSettings, profile)
    app.provide(ApplicationBootstrap.Token, new ApplicationBootstrap({
        dining: dining.loadDining, history: dining.loadHistory, collection: dining.loadCollection, profile, identity:new UniUserIdentity(),
    }, database.transaction.bind(database), useApplicationStore(pinia)))
    app.provide<BuffetNavigation>(BuffetNavigation, new UniBuffetNavigation(uni, () => getCurrentPages().length))
}
