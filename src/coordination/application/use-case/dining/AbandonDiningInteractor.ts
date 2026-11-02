import {DiningAccess} from '../../service/DiningAccess';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {AbandonDiningUseCase} from '../../port/in/dining/AbandonDiningUseCase';
import {
    AbandonDiningActivityUseCase
} from '../../../../contexts/accounting/application/port/in/AbandonDiningActivityUseCase';
import {AbandonRoomUseCase} from '../../../../contexts/collaboration/application/port/in/AbandonRoomUseCase';

export class AbandonDiningInteractor extends TransactionalInteractor<AbandonDiningUseCase.Request, AbandonDiningUseCase.Response> implements AbandonDiningUseCase {
    constructor(transactions: TransactionRunner,
                private readonly access: DiningAccess,
                private readonly abandonDiningActivity: AbandonDiningActivityUseCase,
                private readonly abandonRoom: AbandonRoomUseCase) {
        super(transactions, AbandonDiningUseCase.token);
    }

    protected async executeInTransaction(r: AbandonDiningUseCase.Request,
                                         tx: Transaction.Context): Promise<AbandonDiningUseCase.Response> {
        this.access.requireHost(r.session, r.actorId);
        await this.abandonDiningActivity.execute(new AbandonDiningActivityUseCase.Request(r.scope, r.session.activityId));
        if (r.session.roomId)
            await this.abandonRoom.execute(new AbandonRoomUseCase.Request(r.scope, r.session.roomId, r.actorId));
        return new AbandonDiningUseCase.Response(undefined);
    }
}
