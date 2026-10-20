import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import type {AfterCommit} from '@/infrastructure/transaction/AfterCommit'
import type {DiningView} from '@/presentation/dining/DiningView'
import type {ProductAppearanceProvider} from '@/presentation/dining/ProductAppearanceProvider'
import type {CatalogGateway} from './application/port/out/CatalogGateway'
import {LocalDiningRepository} from './infrastructure/persistence/LocalDiningRepository'
import {DiningPresenter} from './infrastructure/presentation/DiningPresenter'
import {SystemDiningClock} from './infrastructure/system/SystemDiningClock'
import {DiningIdGeneratorAdapter} from './infrastructure/system/DiningIdGeneratorAdapter'
import {LoadDiningInteractor} from './application/interactor/LoadDiningInteractor'
import {BeginSessionInteractor} from './application/interactor/BeginSessionInteractor'
import {ChangeSelectionInteractor} from './application/interactor/ChangeSelectionInteractor'
import {CommitRoundInteractor} from './application/interactor/CommitRoundInteractor'
import {PrepareDiningCompletionInteractor} from './application/interactor/PrepareDiningCompletionInteractor'
import {CloseDiningInteractor} from './application/interactor/CloseDiningInteractor'

export function createSession(database: LocalDiningDatabase, view: DiningView,
                              catalog: CatalogGateway, afterCommit: AfterCommit,
                              appearance: ProductAppearanceProvider) {
    const repository = new LocalDiningRepository(database)
    const clock = new SystemDiningClock()
    const presenter = new DiningPresenter(view, appearance, catalog, clock, afterCommit)
    return {
        loadDining: new LoadDiningInteractor(repository, presenter),
        beginSession: new BeginSessionInteractor(repository, repository, presenter, new DiningIdGeneratorAdapter()),
        changeSelection: new ChangeSelectionInteractor(repository, repository, presenter, catalog),
        commitRound: new CommitRoundInteractor(repository, repository, presenter, catalog, clock),
        prepareDiningCompletion: new PrepareDiningCompletionInteractor(repository, catalog, clock, clock),
        closeDining: new CloseDiningInteractor(repository, repository, presenter),
    }
}
