import {TransactionalInteractor} from '../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../kernel/application/Transaction';
import {SelectDiningSessionUseCase} from '../port/in/SelectDiningSessionUseCase';
import {LocalDiningData} from '../port/out/LocalDiningData';

export class SelectDiningSessionInteractor extends TransactionalInteractor<SelectDiningSessionUseCase.Request, SelectDiningSessionUseCase.Response> implements SelectDiningSessionUseCase {
    constructor(transactions: TransactionRunner, private readonly data: LocalDiningData) {
        super(transactions, SelectDiningSessionUseCase.token);
    }

    protected async executeInTransaction(r: SelectDiningSessionUseCase.Request,
                                         tx: Transaction.Context): Promise<SelectDiningSessionUseCase.Response> {
        await this.data.selectSession(r.session, tx);
        return new SelectDiningSessionUseCase.Response();
    }
}
