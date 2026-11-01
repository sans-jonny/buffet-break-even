import {TransactionRunner} from '../../kernel/application/TransactionRunner';
import {Transaction} from '../../kernel/application/Transaction';

/** Injected into transaction-scoped Interactors; it joins but never commits the outer unit. */
export class ActiveTransactionRunner implements TransactionRunner {
    constructor(private readonly owner: TransactionRunner, readonly view: Transaction.Context) {
    }

    async run<T>(scopeId: string, roomId: string | null, work: (tx: Transaction.Context) => Promise<T>): Promise<T> {
        this.assertActive(this.view, scopeId, roomId);
        return work(this.view);
    }

    assertActive(tx: Transaction.Context, scopeId: string, roomId: string | null): void {
        if (tx !== this.view)
            throw new Error('INVALID_TRANSACTION_CONTEXT');
        this.owner.assertActive(tx, scopeId, roomId);
    }
}
