import {TransactionalInteractor} from '../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../kernel/application/Transaction';
import {DeleteReceiptUseCase} from '../port/in/DeleteReceiptUseCase';
import {LocalDiningData} from '../port/out/LocalDiningData';

export class DeleteReceiptInteractor extends TransactionalInteractor<DeleteReceiptUseCase.Request, DeleteReceiptUseCase.Response> implements DeleteReceiptUseCase {
    constructor(transactions: TransactionRunner, private readonly data: LocalDiningData) {
        super(transactions, DeleteReceiptUseCase.token);
    }

    protected async executeInTransaction(r: DeleteReceiptUseCase.Request,
                                         tx: Transaction.Context): Promise<DeleteReceiptUseCase.Response> {
        await this.data.deleteReceipt(tx);
        return new DeleteReceiptUseCase.Response();
    }
}
