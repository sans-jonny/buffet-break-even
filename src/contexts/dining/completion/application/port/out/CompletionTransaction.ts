export interface CompletionTransaction {
    run<T>(work: () => T): T
}
