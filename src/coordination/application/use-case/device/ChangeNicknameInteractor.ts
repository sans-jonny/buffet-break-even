import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {ChangeNicknameUseCase} from '../../port/in/device/ChangeNicknameUseCase';
import {LocalDiningData} from '../../port/out/device/LocalDiningData';

export class ChangeNicknameInteractor extends TransactionalInteractor<ChangeNicknameUseCase.Request, ChangeNicknameUseCase.Response> implements ChangeNicknameUseCase {
    constructor(transactions: TransactionRunner, private readonly data: LocalDiningData) {
        super(transactions, ChangeNicknameUseCase.token);
    }

    protected async executeInTransaction(r: ChangeNicknameUseCase.Request,
                                         tx: Transaction.Context): Promise<ChangeNicknameUseCase.Response> {
        await this.data.changeNickname(r.nickname.trim(), tx);
        return new ChangeNicknameUseCase.Response();
    }
}
