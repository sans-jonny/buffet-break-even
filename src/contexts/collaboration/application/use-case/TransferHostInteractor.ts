import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransferHostUseCase} from '../port/in/TransferHostUseCase';
import {DiningRoomRepository} from '../port/out/DiningRoomRepository';

export class TransferHostInteractor extends TransactionalInteractor<TransferHostUseCase.Request, TransferHostUseCase.Response> implements TransferHostUseCase {
    constructor(transactions: TransactionRunner, private readonly rooms: DiningRoomRepository) {
        super(transactions, TransferHostUseCase.token);
    }

    protected async executeInTransaction(r: TransferHostUseCase.Request,
                                         tx: Transaction.Context): Promise<TransferHostUseCase.Response> {
        const room = this.rooms.findById(r.roomId);
        Domain.require(room, 'ROOM_NOT_FOUND');
        const saved = await this.rooms.apply(room.transferHost(r.actorId, r.targetId));
        return new TransferHostUseCase.Response(saved!.snapshot());
    }
}
