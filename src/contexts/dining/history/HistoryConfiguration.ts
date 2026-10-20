import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import type {AfterCommit} from '@/infrastructure/transaction/AfterCommit'
import type {HistoryView} from '@/presentation/history/HistoryView'
import {LocalHistoryRepository} from './infrastructure/persistence/LocalHistoryRepository'
import {HistoryPresenter} from './infrastructure/presentation/HistoryPresenter'
import {LoadHistoryInteractor} from './application/interactor/LoadHistoryInteractor'
import {SaveRecordInteractor} from './application/interactor/SaveRecordInteractor'
import {DeleteRecordInteractor} from './application/interactor/DeleteRecordInteractor'

export function createHistory(database: LocalDiningDatabase, view: HistoryView, afterCommit: AfterCommit) {
    const repository = new LocalHistoryRepository(database)
    const presenter = new HistoryPresenter(view, afterCommit)
    return {
        loadHistory: new LoadHistoryInteractor(repository, presenter),
        saveRecord: new SaveRecordInteractor(repository, repository, presenter),
        deleteRecord: new DeleteRecordInteractor(repository, repository, presenter),
    }
}
