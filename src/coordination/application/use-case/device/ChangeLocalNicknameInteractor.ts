import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {ChangeLocalNicknameUseCase} from '../../port/in/device/ChangeLocalNicknameUseCase';
import {LocalDiningData} from '../../port/out/device/LocalDiningData';

export class ChangeLocalNicknameInteractor extends TransactionalInteractor<ChangeLocalNicknameUseCase.Request, ChangeLocalNicknameUseCase.Response> implements ChangeLocalNicknameUseCase {
    constructor(transactions: TransactionRunner, private readonly data: LocalDiningData) {
        super(transactions, ChangeLocalNicknameUseCase.token);
    }

    protected async executeInTransaction(r: ChangeLocalNicknameUseCase.Request,
                                         tx: Transaction.Context): Promise<ChangeLocalNicknameUseCase.Response> {
        await this.data.changeNickname(r.nickname.trim(), tx);
        return new ChangeLocalNicknameUseCase.Response();
    }
}
