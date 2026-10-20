import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import type {AfterCommit} from '@/infrastructure/transaction/AfterCommit'
import type {HistoryViewModel} from '@/presentation/history/HistoryViewModel'
import type {ViewStore} from '@/presentation/shared/ViewStore'
import {LocalHistoryRepository} from './infrastructure/persistence/LocalHistoryRepository'
import {HistoryPresenter} from './infrastructure/presentation/HistoryPresenter'
import {LoadHistoryInteractor} from './application/interactor/LoadHistoryInteractor'
import {SaveRecordInteractor} from './application/interactor/SaveRecordInteractor'
import {DeleteRecordInteractor} from './application/interactor/DeleteRecordInteractor'

export function createHistory(database: LocalDiningDatabase, store: ViewStore<HistoryViewModel>, afterCommit: AfterCommit) {
    const repository = new LocalHistoryRepository(database)
    const presenter = new HistoryPresenter(store, afterCommit)
    return {
        loadHistory: new LoadHistoryInteractor(repository, presenter),
        saveRecord: new SaveRecordInteractor(repository, repository, presenter),
        deleteRecord: new DeleteRecordInteractor(repository, repository, presenter),
    }
}
