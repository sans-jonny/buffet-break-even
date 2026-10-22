import type {App} from 'vue'
import type {Pinia} from 'pinia'
import {createCatalog} from '@/contexts/catalog/CatalogConfiguration'
import {createDining} from '@/contexts/dining/DiningConfiguration'
import {GetMenuInput, GetCatalogInput} from '@/contexts/catalog/public'
import {LoadDiningInput, BeginSessionInput, ChangeSelectionInput, CommitRoundInput,
    LoadHistoryInput, DeleteRecordInput, LoadCollectionInput, DeleteReceiptInput, CompleteDiningInput} from '@/contexts/dining/public'
import {SaveRecordInput} from '@/contexts/dining/history/public'
import {CollectReceiptInput} from '@/contexts/dining/collection/public'
import {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import {UniSnapshotStorage} from '@/infrastructure/persistence/storage/UniSnapshotStorage'
import {useDiningStore} from '@/ui/stores/useDiningStore'
import {useHistoryStore} from '@/ui/stores/useHistoryStore'
import {useCollectionStore} from '@/ui/stores/useCollectionStore'
import {useApplicationStore} from '@/ui/stores/useApplicationStore'
import {useRoomStore} from '@/ui/stores/useRoomStore'
import {productAppearance} from '@/presentation/dining/productAppearance'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {UniBuffetNavigation} from '@/ui/navigation/UniBuffetNavigation'
import {createRoom} from '@/contexts/room/RoomConfiguration'
import {CreateRoomInput, JoinRoomInput, RenameInput, BeginRoomInput, ChangeRoomSelectionInput,
    CommitRoomRoundInput, FinishRoomInput, CloseRoomInput, LeaveRoomInput} from '@/contexts/room/public'
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
    // 多人房间房主本地保存复用历史记录与小票收藏端口（见 contexts/room 的 P4 结算）。
    app.provide<SaveRecordInput>(SaveRecordInput.Token, dining.saveRecord)
    app.provide<CollectReceiptInput>(CollectReceiptInput.Token, dining.collectReceipt)
    app.provide(ApplicationBootstrap.Token, new ApplicationBootstrap({
        dining: dining.loadDining, history: dining.loadHistory, collection: dining.loadCollection,
    }, database.transaction.bind(database), useApplicationStore(pinia)))
    // 生产环境请改成 wss://你的域名/room（微信小程序要求 HTTPS + 备案域名，见 server/README.md）
    const room = createRoom('ws://localhost:3000/room', useRoomStore(pinia), productAppearance)
    app.provide<CreateRoomInput>(CreateRoomInput.Token, room.createRoom)
    app.provide<JoinRoomInput>(JoinRoomInput.Token, room.joinRoom)
    app.provide<RenameInput>(RenameInput.Token, room.rename)
    app.provide<BeginRoomInput>(BeginRoomInput.Token, room.beginRoom)
    app.provide<ChangeRoomSelectionInput>(ChangeRoomSelectionInput.Token, room.changeRoomSelection)
    app.provide<CommitRoomRoundInput>(CommitRoomRoundInput.Token, room.commitRoomRound)
    app.provide<FinishRoomInput>(FinishRoomInput.Token, room.finishRoom)
    app.provide<CloseRoomInput>(CloseRoomInput.Token, room.closeRoom)
    app.provide<LeaveRoomInput>(LeaveRoomInput.Token, room.leaveRoom)
    app.provide<BuffetNavigation>(BuffetNavigation, new UniBuffetNavigation(uni, () => getCurrentPages().length))
}
