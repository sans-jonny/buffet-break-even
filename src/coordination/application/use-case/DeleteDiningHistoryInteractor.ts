import {TransactionalInteractor} from '../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../kernel/application/Transaction';
import {DeleteDiningHistoryUseCase} from '../port/in/DeleteDiningHistoryUseCase';
import {LocalDiningData} from '../port/out/LocalDiningData';

export class DeleteDiningHistoryInteractor extends TransactionalInteractor<DeleteDiningHistoryUseCase.Request, DeleteDiningHistoryUseCase.Response> implements DeleteDiningHistoryUseCase {
    constructor(transactions: TransactionRunner, private readonly data: LocalDiningData) {
        super(transactions, DeleteDiningHistoryUseCase.token);
    }

    protected async executeInTransaction(r: DeleteDiningHistoryUseCase.Request,
                                         tx: Transaction.Context): Promise<DeleteDiningHistoryUseCase.Response> {
        await this.data.deleteHistory(r.activityId, tx);
        return new DeleteDiningHistoryUseCase.Response();
    }
}
