import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {LeaveRoomUseCase} from '../port/in/LeaveRoomUseCase';
import {DiningRoomRepository} from '../port/out/DiningRoomRepository';

export class LeaveRoomInteractor extends TransactionalInteractor<LeaveRoomUseCase.Request, LeaveRoomUseCase.Response> implements LeaveRoomUseCase {
    constructor(transactions: TransactionRunner, private readonly rooms: DiningRoomRepository) {
        super(transactions, LeaveRoomUseCase.token);
    }

    protected async executeInTransaction(r: LeaveRoomUseCase.Request,
                                         tx: Transaction.Context): Promise<LeaveRoomUseCase.Response> {
        const room = this.rooms.findById(r.roomId);
        Domain.require(room, 'ROOM_NOT_FOUND');
        const saved = await this.rooms.apply(room.leave(r.memberId, r.date));
        return new LeaveRoomUseCase.Response(saved!.snapshot());
    }
}
