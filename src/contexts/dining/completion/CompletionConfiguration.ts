import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import type {PrepareDiningCompletionInput, CloseDiningInput} from '../session/public'
import type {SaveRecordInput} from '../history/public'
import type {CollectReceiptInput} from '../collection/public'
import {CompleteDiningInteractor} from './application/interactor/CompleteDiningInteractor'
import {SaveRoomResultInteractor} from './application/interactor/SaveRoomResultInteractor'
import {SaveDiningReceiptInteractor} from './application/interactor/SaveDiningReceiptInteractor'
import {LocalCompletionTransaction} from './infrastructure/transaction/LocalCompletionTransaction'

export function createCompletion(database: LocalDiningDatabase, prepare: PrepareDiningCompletionInput,
                                  save: SaveRecordInput, collect: CollectReceiptInput, close: CloseDiningInput) {
    const transaction = new LocalCompletionTransaction(database)
    return {completeDining: new CompleteDiningInteractor(prepare, save, collect, close, transaction),
        saveDiningReceipt: new SaveDiningReceiptInteractor(prepare, collect, transaction),
        saveRoomResult: new SaveRoomResultInteractor(save, collect, transaction)}
}
