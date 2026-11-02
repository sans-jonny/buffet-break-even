import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {ClearDiningSessionUseCase} from '../../port/in/device/ClearDiningSessionUseCase';
import {LocalDiningData} from '../../port/out/device/LocalDiningData';

export class ClearDiningSessionInteractor extends TransactionalInteractor<ClearDiningSessionUseCase.Request, ClearDiningSessionUseCase.Response> implements ClearDiningSessionUseCase {
    constructor(transactions: TransactionRunner, private readonly data: LocalDiningData) {
        super(transactions, ClearDiningSessionUseCase.token);
    }

    protected async executeInTransaction(r: ClearDiningSessionUseCase.Request,
                                         tx: Transaction.Context): Promise<ClearDiningSessionUseCase.Response> {
        await this.data.clearSession(tx);
        return new ClearDiningSessionUseCase.Response();
    }
}
