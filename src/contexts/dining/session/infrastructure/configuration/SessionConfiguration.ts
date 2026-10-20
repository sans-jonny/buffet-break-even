import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import type {AfterCommit} from '@/infrastructure/transaction/AfterCommit'
import type {DiningViewModel} from '@/presentation/dining/DiningViewModel'
import type {CatalogGateway} from '../../application/port/out/CatalogGateway'
import {LocalDiningRepository} from '../persistence/LocalDiningRepository'
import {DiningPresenter} from '../presentation/DiningPresenter'
import {SystemDiningClock} from '../system/SystemDiningClock'
import {DiningIdGeneratorAdapter} from '../system/DiningIdGeneratorAdapter'
import {LoadDiningInteractor} from '../../application/interactor/LoadDiningInteractor'
import {BeginSessionInteractor} from '../../application/interactor/BeginSessionInteractor'
import {ChangeSelectionInteractor} from '../../application/interactor/ChangeSelectionInteractor'
import {CommitRoundInteractor} from '../../application/interactor/CommitRoundInteractor'
import {PrepareDiningCompletionInteractor} from '../../application/interactor/PrepareDiningCompletionInteractor'
import {CloseDiningInteractor} from '../../application/interactor/CloseDiningInteractor'

export function createSession(database: LocalDiningDatabase, store: {present(view: DiningViewModel): void},
                              catalog: CatalogGateway, afterCommit: AfterCommit,
                              appearance: (id: string) => {emoji: string; gradient: string}) {
    const repository = new LocalDiningRepository(database)
    const clock = new SystemDiningClock()
    const presenter = new DiningPresenter(store, appearance, catalog, clock, afterCommit)
    return {
        loadDining: new LoadDiningInteractor(repository, presenter),
        beginSession: new BeginSessionInteractor(repository, repository, presenter, new DiningIdGeneratorAdapter()),
        changeSelection: new ChangeSelectionInteractor(repository, repository, presenter, catalog),
        commitRound: new CommitRoundInteractor(repository, repository, presenter, catalog, clock),
        prepareDiningCompletion: new PrepareDiningCompletionInteractor(repository, catalog, clock, clock),
        closeDining: new CloseDiningInteractor(repository, repository, presenter),
    }
}
