import {Domain} from '../../../kernel/domain/Domain';
import {Transaction} from '../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../kernel/application/TransactionalInteractor';
import {LeaveDiningRoomUseCase} from '../port/in/LeaveDiningRoomUseCase';
import {LeaveRoomUseCase} from '../../../contexts/collaboration/application/port/in/LeaveRoomUseCase';

export class LeaveDiningRoomInteractor extends TransactionalInteractor<LeaveDiningRoomUseCase.Request, LeaveDiningRoomUseCase.Response> implements LeaveDiningRoomUseCase {
    constructor(transactions: TransactionRunner,
                private readonly leaveRoom: LeaveRoomUseCase,
                private readonly now: () => string) {
        super(transactions, LeaveDiningRoomUseCase.token);
    }

    protected async executeInTransaction(r: LeaveDiningRoomUseCase.Request,
                                         tx: Transaction.Context): Promise<LeaveDiningRoomUseCase.Response> {
        Domain.require(r.session.roomId, 'ROOM_REQUIRED');
        await this.leaveRoom.execute(new LeaveRoomUseCase.Request(r.scope, r.session.roomId, r.actorId, this.now()));
        return new LeaveDiningRoomUseCase.Response(undefined);
    }
}
