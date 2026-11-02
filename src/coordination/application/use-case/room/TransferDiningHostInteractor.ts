import {Domain} from '../../../../kernel/domain/Domain';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransferDiningHostUseCase} from '../../port/in/room/TransferDiningHostUseCase';
import {TransferHostUseCase} from '../../../../contexts/collaboration/application/port/in/TransferHostUseCase';
import {DiningAccess} from '../../service/DiningAccess';

export class TransferDiningHostInteractor extends TransactionalInteractor<TransferDiningHostUseCase.Request, TransferDiningHostUseCase.Response> implements TransferDiningHostUseCase {
    constructor(transactions: TransactionRunner,
                private readonly access: DiningAccess,
                private readonly transferHost: TransferHostUseCase) {
        super(transactions, TransferDiningHostUseCase.token);
    }

    protected async executeInTransaction(r: TransferDiningHostUseCase.Request,
                                         tx: Transaction.Context): Promise<TransferDiningHostUseCase.Response> {
        this.access.requireHost(r.session, r.actorId);

        await this.transferHost.execute(new TransferHostUseCase.Request(r.scope, r.session.roomId!, r.actorId, r.targetId));
        return new TransferDiningHostUseCase.Response(undefined);
    }
}
