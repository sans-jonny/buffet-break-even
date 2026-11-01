import {Domain} from '../../../kernel/domain/Domain';
import {Transaction} from '../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../kernel/application/TransactionalInteractor';
import {AbandonDiningUseCase} from '../port/in/AbandonDiningUseCase';
import {
    AbandonDiningActivityUseCase
} from '../../../contexts/accounting/application/port/in/AbandonDiningActivityUseCase';
import {AbandonRoomUseCase} from '../../../contexts/collaboration/application/port/in/AbandonRoomUseCase';
import {GetRoomUseCase} from '../../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {AuthorizeRoomUseCase} from '../../../contexts/collaboration/application/port/in/AuthorizeRoomUseCase';

export class AbandonDiningInteractor extends TransactionalInteractor<AbandonDiningUseCase.Request, AbandonDiningUseCase.Response> implements AbandonDiningUseCase {
    constructor(transactions: TransactionRunner,
                private readonly abandonDiningActivity: AbandonDiningActivityUseCase,
                private readonly getRoom: GetRoomUseCase,
                private readonly authorizeRoom: AuthorizeRoomUseCase,
                private readonly abandonRoom: AbandonRoomUseCase) {
        super(transactions, AbandonDiningUseCase.token);
    }

    protected async executeInTransaction(r: AbandonDiningUseCase.Request,
                                         tx: Transaction.Context): Promise<AbandonDiningUseCase.Response> {
        if (r.session.roomId) {
            const room = this.getRoom.execute(new GetRoomUseCase.Request(r.session.roomId)).value;
            Domain.require(room && room.activityId === r.session.activityId, 'ROOM_ACTIVITY_MISMATCH');
            this.authorizeRoom.execute(new AuthorizeRoomUseCase.Request(r.session.roomId, r.actorId, true));
        }
        await this.abandonDiningActivity.execute(new AbandonDiningActivityUseCase.Request(r.scope, r.session.activityId));
        if (r.session.roomId)
            await this.abandonRoom.execute(new AbandonRoomUseCase.Request(r.scope, r.session.roomId, r.actorId));
        return new AbandonDiningUseCase.Response(undefined);
    }
}
