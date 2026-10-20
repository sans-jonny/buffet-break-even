import type {CompletionTransaction} from '../application/port/out/CompletionTransaction'
import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'

export class LocalCompletionTransaction implements CompletionTransaction {
    constructor(private readonly database: LocalDiningDatabase) {
    }

    run<T>(work: () => T): T {
        return this.database.transaction(work)
    }
}
