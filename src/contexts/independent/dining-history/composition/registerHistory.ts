import type {App} from 'vue'
import type {Pinia} from 'pinia'
import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import {useHistoryStore} from '@/stores/useHistoryStore'
import {LocalHistoryRepository} from '../adapter/persistence/LocalHistoryRepository'
import {HistoryPresenter} from '../adapter/presenter/HistoryPresenter'
import {LoadHistoryInput} from '../public'
import {LoadHistoryInteractor} from '../application/interactor/LoadHistoryInteractor'
import {SaveRecordInput} from '../public'
import {SaveRecordInteractor} from '../application/interactor/SaveRecordInteractor'
import {DeleteRecordInput} from '../public'
import {DeleteRecordInteractor} from '../application/interactor/DeleteRecordInteractor'

export function registerHistory(app: App, pinia: Pinia, database: LocalDiningDatabase): {
    loadHistory: LoadHistoryInput
    saveRecord: SaveRecordInput
    deleteRecord: DeleteRecordInput
} {
    const repository = new LocalHistoryRepository(database)
    const presenter = new HistoryPresenter(useHistoryStore(pinia), database)
    const loadHistory = new LoadHistoryInteractor(repository, presenter)
    app.provide<LoadHistoryInput>(LoadHistoryInput.Token, loadHistory)
    const saveRecord = new SaveRecordInteractor(repository, repository, presenter)
    app.provide<SaveRecordInput>(SaveRecordInput.Token, saveRecord)
    const deleteRecord = new DeleteRecordInteractor(repository, repository, presenter)
    app.provide<DeleteRecordInput>(DeleteRecordInput.Token, deleteRecord)
    return {loadHistory, saveRecord, deleteRecord}
}
