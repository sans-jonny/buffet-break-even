import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import type {AfterCommit} from '@/infrastructure/transaction/AfterCommit'
import type {CollectionViewModel} from '@/presentation/collection/CollectionViewModel'
import {LocalCollectionRepository} from '../persistence/LocalCollectionRepository'
import {CollectionPresenter} from '../presentation/CollectionPresenter'
import {LoadCollectionInteractor} from '../../application/interactor/LoadCollectionInteractor'
import {CollectReceiptInteractor} from '../../application/interactor/CollectReceiptInteractor'
import {DeleteReceiptInteractor} from '../../application/interactor/DeleteReceiptInteractor'

export function createCollection(database: LocalDiningDatabase, store: {present(view: CollectionViewModel): void}, afterCommit: AfterCommit) {
    const repository = new LocalCollectionRepository(database)
    const presenter = new CollectionPresenter(store, afterCommit)
    return {
        loadCollection: new LoadCollectionInteractor(repository, presenter),
        collectReceipt: new CollectReceiptInteractor(repository, repository, presenter),
        deleteReceipt: new DeleteReceiptInteractor(repository, repository, presenter),
    }
}
