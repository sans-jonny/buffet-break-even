import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import type {PrepareDiningCompletionInput, CloseDiningInput} from '../session/public'
import type {SaveRecordInput} from '../history/public'
import type {CollectReceiptInput} from '../collection/public'
import {CompleteDiningInteractor} from './application/interactor/CompleteDiningInteractor'
import {LocalCompletionTransaction} from './infrastructure/transaction/LocalCompletionTransaction'

export function createCompletion(database: LocalDiningDatabase, prepare: PrepareDiningCompletionInput,
                                  save: SaveRecordInput, collect: CollectReceiptInput, close: CloseDiningInput) {
    return {completeDining: new CompleteDiningInteractor(prepare, save, collect, close, new LocalCompletionTransaction(database))}
}
