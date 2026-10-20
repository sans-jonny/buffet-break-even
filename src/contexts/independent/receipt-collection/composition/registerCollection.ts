import type {App} from 'vue'
import type {Pinia} from 'pinia'
import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import {useCollectionStore} from '@/stores/useCollectionStore'
import {LocalCollectionRepository} from '../adapter/persistence/LocalCollectionRepository'
import {CollectionPresenter} from '../adapter/presenter/CollectionPresenter'
import {LoadCollectionInput} from '../public'
import {LoadCollectionInteractor} from '../application/interactor/LoadCollectionInteractor'
import {CollectReceiptInput} from '../public'
import {CollectReceiptInteractor} from '../application/interactor/CollectReceiptInteractor'
import {DeleteReceiptInput} from '../public'
import {DeleteReceiptInteractor} from '../application/interactor/DeleteReceiptInteractor'

export function registerCollection(app: App, pinia: Pinia, database: LocalDiningDatabase): {
    loadCollection: LoadCollectionInput
    collectReceipt: CollectReceiptInput
    deleteReceipt: DeleteReceiptInput
} {
    const repository = new LocalCollectionRepository(database)
    const presenter = new CollectionPresenter(useCollectionStore(pinia), database)
    const loadCollection = new LoadCollectionInteractor(repository, presenter)
    app.provide<LoadCollectionInput>(LoadCollectionInput.Token, loadCollection)
    const collectReceipt = new CollectReceiptInteractor(repository, repository, presenter)
    app.provide<CollectReceiptInput>(CollectReceiptInput.Token, collectReceipt)
    const deleteReceipt = new DeleteReceiptInteractor(repository, repository, presenter)
    app.provide<DeleteReceiptInput>(DeleteReceiptInput.Token, deleteReceipt)
    return {loadCollection, collectReceipt, deleteReceipt}
}
