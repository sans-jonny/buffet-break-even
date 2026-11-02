import {Domain} from '../../../../kernel/domain/Domain';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransferDiningHostUseCase} from '../../port/in/room/TransferDiningHostUseCase';
import {TransferHostUseCase} from '../../../../contexts/collaboration/application/port/in/TransferHostUseCase';
import {GetRoomUseCase} from '../../../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {AuthorizeRoomUseCase} from '../../../../contexts/collaboration/application/port/in/AuthorizeRoomUseCase';

export class TransferDiningHostInteractor extends TransactionalInteractor<TransferDiningHostUseCase.Request, TransferDiningHostUseCase.Response> implements TransferDiningHostUseCase {
    constructor(transactions: TransactionRunner,
                private readonly getRoom: GetRoomUseCase,
                private readonly authorizeRoom: AuthorizeRoomUseCase,
                private readonly transferHost: TransferHostUseCase) {
        super(transactions, TransferDiningHostUseCase.token);
    }

    protected async executeInTransaction(r: TransferDiningHostUseCase.Request,
                                         tx: Transaction.Context): Promise<TransferDiningHostUseCase.Response> {
        if (r.session.roomId) {
            const room = this.getRoom.execute(new GetRoomUseCase.Request(r.session.roomId)).value;
            Domain.require(room && room.activityId === r.session.activityId, 'ROOM_ACTIVITY_MISMATCH');
            this.authorizeRoom.execute(new AuthorizeRoomUseCase.Request(r.session.roomId, r.actorId, true));
        }
        Domain.require(r.session.roomId, 'ROOM_REQUIRED');
        await this.transferHost.execute(new TransferHostUseCase.Request(r.scope, r.session.roomId, r.actorId, r.targetId));
        return new TransferDiningHostUseCase.Response(undefined);
    }
}
