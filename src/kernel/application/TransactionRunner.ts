import type {Transaction} from './Transaction';

export interface TransactionRunner {
    readonly view?: Transaction.View;

    resolve?<T>(token: symbol, tx: Transaction.Context): T;

    run<T>(scopeId: string, roomId: string | null, work: (tx: Transaction.Context) => Promise<T>): Promise<T>;

    assertActive(tx: Transaction.Context, scopeId: string, roomId: string | null): void;
}

export namespace TransactionRunner {
    export const token = Symbol("TransactionRunner");
}
