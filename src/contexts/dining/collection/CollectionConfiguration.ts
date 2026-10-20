import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import type {AfterCommit} from '@/infrastructure/transaction/AfterCommit'
import type {CollectionView} from '@/presentation/collection/CollectionView'
import {LocalCollectionRepository} from './infrastructure/persistence/LocalCollectionRepository'
import {CollectionPresenter} from './infrastructure/presentation/CollectionPresenter'
import {LoadCollectionInteractor} from './application/interactor/LoadCollectionInteractor'
import {CollectReceiptInteractor} from './application/interactor/CollectReceiptInteractor'
import {DeleteReceiptInteractor} from './application/interactor/DeleteReceiptInteractor'

export function createCollection(database: LocalDiningDatabase, view: CollectionView, afterCommit: AfterCommit) {
    const repository = new LocalCollectionRepository(database)
    const presenter = new CollectionPresenter(view, afterCommit)
    return {
        loadCollection: new LoadCollectionInteractor(repository, presenter),
        collectReceipt: new CollectReceiptInteractor(repository, repository, presenter),
        deleteReceipt: new DeleteReceiptInteractor(repository, repository, presenter),
    }
}
