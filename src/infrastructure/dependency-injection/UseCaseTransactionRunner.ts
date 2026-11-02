import {TransactionRunner} from '../../kernel/application/TransactionRunner';
import {Transaction} from '../../kernel/application/Transaction';
import type {InjectionToken} from '../../kernel/application/InjectionToken';

/** Root runner resolves the concrete Interactor in a fresh native DI scope after PREPARE begins. */
export class UseCaseTransactionRunner implements TransactionRunner {
    constructor(private readonly owner: TransactionRunner, private readonly scope: (tx: Transaction.Context) => {
        resolve<T>(token: InjectionToken<T>): T;
    }) {
    }

    run<T>(scopeId: string, roomId: string | null, work: (tx: Transaction.Context) => Promise<T>): Promise<T> {
        return this.owner.run(scopeId, roomId, work);
    }

    assertActive(tx: Transaction.Context, scopeId: string, roomId: string | null): void {
        this.owner.assertActive(tx, scopeId, roomId);
    }

    resolve<T>(token: InjectionToken<T>, tx: Transaction.Context): T {
        this.assertActive(tx, tx.scopeId, tx.roomId);
        return this.scope(tx).resolve(token);
    }
}
