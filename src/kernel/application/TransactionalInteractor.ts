import type {InjectionToken} from './InjectionToken';
import {UseCase} from './UseCase';
import {Transaction} from './Transaction';
import {TransactionRunner} from './TransactionRunner';

/** Transactional implementation of a UseCase; concrete business Interactors inherit it. */
export abstract class TransactionalInteractor<R extends UseCase.TransactionRequest, S extends UseCase.Response> implements UseCase<R, S> {
    protected constructor(private readonly transactions: TransactionRunner, private readonly token: InjectionToken<UseCase<R, S>>) {
    }

    execute(request: R): Promise<S> {
        return this.transactions.run(request.scope.scopeId, request.scope.roomId, async (tx) => {
            if (this.transactions.resolve)
                return await this.transactions.resolve(this.token, tx).execute(request);
            return await this.executeInTransaction(request, tx);
        });
    }

    protected abstract executeInTransaction(request: R, tx: Transaction.Context): Promise<S>;
}
