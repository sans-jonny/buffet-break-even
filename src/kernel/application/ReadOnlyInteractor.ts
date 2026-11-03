import {UseCase} from './UseCase';
import {Transaction} from './Transaction';
import {TransactionRunner} from './TransactionRunner';

export abstract class ReadOnlyInteractor<R extends UseCase.Request, S extends UseCase.Response> implements UseCase<R, S> {
    protected constructor(private readonly transactions: TransactionRunner) {
    }

    execute(request: R): S {
        const view = this.transactions.view;
        if (view && 'phase' in view) {
            const tx = view as Transaction.Context;
            this.transactions.assertActive(tx, tx.scopeId, tx.roomId);
        }
        return this.read(request, view);
    }

    protected abstract read(request: R, view?: Transaction.View): S;
}
