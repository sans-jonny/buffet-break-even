import type {App} from 'vue'
import type {Pinia} from 'pinia'
import {useBuffetViewStore} from '@/stores/useBuffetViewStore'
import {productAppearance} from '@/components/product-card/productAppearance'
import {
    LoadBuffetInput,
    BeginSessionInput,
    ChangeSelectionInput,
    CommitRoundInput,
    CompleteDiningInput,
    DeleteRecordInput,
    DeleteReceiptInput
} from '../public'
import {CachedBuffetRepository} from '../adapter/persistence/CachedBuffetRepository'
import {LoadBuffetInteractor} from '../application/interactor/LoadBuffetInteractor'
import {BeginSessionInteractor} from '../application/interactor/BeginSessionInteractor'
import {ChangeSelectionInteractor} from '../application/interactor/ChangeSelectionInteractor'
import {CommitRoundInteractor} from '../application/interactor/CommitRoundInteractor'
import {CompleteDiningInteractor} from '../application/interactor/CompleteDiningInteractor'
import {DeleteRecordInteractor} from '../application/interactor/DeleteRecordInteractor'
import {DeleteReceiptInteractor} from '../application/interactor/DeleteReceiptInteractor'
import {LocalCatalogGateway} from '../adapter/gateway/LocalCatalogGateway'
import {SystemDiningClock} from '../adapter/gateway/SystemDiningClock'
import {UniBuffetGateway} from '../adapter/persistence/UniBuffetGateway'
import type {StoragePort} from '../adapter/persistence/StoragePort'
import {BuffetPresenter} from '../adapter/presenter/BuffetPresenter'

export function registerBuffet(app: App, pinia: Pinia, storage: StoragePort): {
    loadBuffet: LoadBuffetInput
    beginSession: BeginSessionInput
    changeSelection: ChangeSelectionInput
    commitRound: CommitRoundInput
    completeDining: CompleteDiningInput
    deleteRecord: DeleteRecordInput
    deleteReceipt: DeleteReceiptInput
} {
    const repository = new CachedBuffetRepository(new UniBuffetGateway(storage))
    const catalog = new LocalCatalogGateway()
    const clock = new SystemDiningClock()
    const presenter = new BuffetPresenter(useBuffetViewStore(pinia), productAppearance, catalog, clock)
    const inputs = {
        loadBuffet: new LoadBuffetInteractor(repository, presenter),
        beginSession: new BeginSessionInteractor(repository, repository, presenter, clock),
        changeSelection: new ChangeSelectionInteractor(repository, repository, presenter, catalog),
        commitRound: new CommitRoundInteractor(repository, repository, presenter, catalog, clock),
        completeDining: new CompleteDiningInteractor(repository, repository, presenter, catalog, clock, clock),
        deleteRecord: new DeleteRecordInteractor(repository, repository, presenter),
        deleteReceipt: new DeleteReceiptInteractor(repository, repository, presenter),
    }
    app.provide<LoadBuffetInput>(LoadBuffetInput.Token, inputs.loadBuffet)
    app.provide<BeginSessionInput>(BeginSessionInput.Token, inputs.beginSession)
    app.provide<ChangeSelectionInput>(ChangeSelectionInput.Token, inputs.changeSelection)
    app.provide<CommitRoundInput>(CommitRoundInput.Token, inputs.commitRound)
    app.provide<CompleteDiningInput>(CompleteDiningInput.Token, inputs.completeDining)
    app.provide<DeleteRecordInput>(DeleteRecordInput.Token, inputs.deleteRecord)
    app.provide<DeleteReceiptInput>(DeleteReceiptInput.Token, inputs.deleteReceipt)
    return inputs
}
