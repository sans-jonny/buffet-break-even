import type {App} from 'vue'
import type {Pinia} from 'pinia'
import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import {useDiningStore} from '@/stores/useDiningStore'
import {productAppearance} from '@/components/product-card/productAppearance'
import {LocalDiningRepository} from '../adapter/persistence/LocalDiningRepository'
import {DiningPresenter} from '../adapter/presenter/DiningPresenter'
import {LocalCatalogGateway} from '../adapter/gateway/LocalCatalogGateway'
import {SystemDiningClock} from '../adapter/gateway/SystemDiningClock'
import {LoadDiningInput} from '../public'
import {LoadDiningInteractor} from '../application/interactor/LoadDiningInteractor'
import {BeginSessionInput} from '../public'
import {BeginSessionInteractor} from '../application/interactor/BeginSessionInteractor'
import {ChangeSelectionInput} from '../public'
import {ChangeSelectionInteractor} from '../application/interactor/ChangeSelectionInteractor'
import {CommitRoundInput} from '../public'
import {CommitRoundInteractor} from '../application/interactor/CommitRoundInteractor'
import {PrepareDiningCompletionInput} from '../public'
import {PrepareDiningCompletionInteractor} from '../application/interactor/PrepareDiningCompletionInteractor'
import {CloseDiningInput} from '../public'
import {CloseDiningInteractor} from '../application/interactor/CloseDiningInteractor'

export function registerDining(app: App, pinia: Pinia, database: LocalDiningDatabase): {
    loadDining: LoadDiningInput
    beginSession: BeginSessionInput
    changeSelection: ChangeSelectionInput
    commitRound: CommitRoundInput
    prepareDiningCompletion: PrepareDiningCompletionInput
    closeDining: CloseDiningInput
} {
    const repository = new LocalDiningRepository(database)
    const catalog = new LocalCatalogGateway()
    const clock = new SystemDiningClock()
    const presenter = new DiningPresenter(useDiningStore(pinia), productAppearance, catalog, clock, database)
    const loadDining = new LoadDiningInteractor(repository, presenter)
    app.provide<LoadDiningInput>(LoadDiningInput.Token, loadDining)
    const beginSession = new BeginSessionInteractor(repository, repository, presenter, clock)
    app.provide<BeginSessionInput>(BeginSessionInput.Token, beginSession)
    const changeSelection = new ChangeSelectionInteractor(repository, repository, presenter, catalog)
    app.provide<ChangeSelectionInput>(ChangeSelectionInput.Token, changeSelection)
    const commitRound = new CommitRoundInteractor(repository, repository, presenter, catalog, clock)
    app.provide<CommitRoundInput>(CommitRoundInput.Token, commitRound)
    const prepareDiningCompletion = new PrepareDiningCompletionInteractor(repository, catalog, clock, clock)
    app.provide<PrepareDiningCompletionInput>(PrepareDiningCompletionInput.Token, prepareDiningCompletion)
    const closeDining = new CloseDiningInteractor(repository, repository, presenter)
    app.provide<CloseDiningInput>(CloseDiningInput.Token, closeDining)
    return {loadDining, beginSession, changeSelection, commitRound, prepareDiningCompletion, closeDining}
}
