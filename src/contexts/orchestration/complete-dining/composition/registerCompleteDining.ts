import type {App} from 'vue'
import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import type {PrepareDiningCompletionInput, CloseDiningInput} from '@/contexts/independent/dining/public'
import type {SaveRecordInput} from '@/contexts/independent/dining-history/public'
import type {CollectReceiptInput} from '@/contexts/independent/receipt-collection/public'
import {CompleteDiningInput} from '../public'
import {CompleteDiningInteractor} from '../application/interactor/CompleteDiningInteractor'
import {LocalCompletionTransaction} from '../adapter/LocalCompletionTransaction'

export function registerCompleteDining(app: App, database: LocalDiningDatabase,
                                       prepare: PrepareDiningCompletionInput, save: SaveRecordInput, collect: CollectReceiptInput, close: CloseDiningInput): CompleteDiningInput {
    const input = new CompleteDiningInteractor(prepare, save, collect, close, new LocalCompletionTransaction(database))
    app.provide<CompleteDiningInput>(CompleteDiningInput.Token, input)
    return input
}
