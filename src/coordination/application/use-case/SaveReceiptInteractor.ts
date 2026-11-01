import {TransactionalInteractor} from '../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../kernel/application/Transaction';
import {SaveReceiptUseCase} from '../port/in/SaveReceiptUseCase';
import {LocalDiningData} from '../port/out/LocalDiningData';

export class SaveReceiptInteractor extends TransactionalInteractor<SaveReceiptUseCase.Request, SaveReceiptUseCase.Response> implements SaveReceiptUseCase {
    constructor(transactions: TransactionRunner, private readonly data: LocalDiningData) {
        super(transactions, SaveReceiptUseCase.token);
    }

    protected async executeInTransaction(r: SaveReceiptUseCase.Request,
                                         tx: Transaction.Context): Promise<SaveReceiptUseCase.Response> {
        await this.data.saveReceipt(r.result, tx);
        return new SaveReceiptUseCase.Response();
    }
}
