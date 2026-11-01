import {TransactionalInteractor} from '../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../kernel/application/Transaction';
import {InitializeIdentityUseCase} from '../port/in/InitializeIdentityUseCase';
import {LocalDiningData} from '../port/out/LocalDiningData';

export class InitializeIdentityInteractor extends TransactionalInteractor<InitializeIdentityUseCase.Request, InitializeIdentityUseCase.Response> implements InitializeIdentityUseCase {
    constructor(transactions: TransactionRunner, private readonly data: LocalDiningData) {
        super(transactions, InitializeIdentityUseCase.token);
    }

    protected async executeInTransaction(r: InitializeIdentityUseCase.Request,
                                         tx: Transaction.Context): Promise<InitializeIdentityUseCase.Response> {
        await this.data.initialize(r.identityId, tx);
        return new InitializeIdentityUseCase.Response();
    }
}
