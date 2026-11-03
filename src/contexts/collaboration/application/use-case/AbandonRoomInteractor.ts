import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {AbandonRoomUseCase} from '../port/in/AbandonRoomUseCase';
import {DiningRoomRepository} from '../port/out/DiningRoomRepository';

export class AbandonRoomInteractor extends TransactionalInteractor<AbandonRoomUseCase.Request, AbandonRoomUseCase.Response> implements AbandonRoomUseCase {
    constructor(transactions: TransactionRunner, private readonly rooms: DiningRoomRepository) {
        super(transactions, AbandonRoomUseCase.token);
    }

    protected async executeInTransaction(r: AbandonRoomUseCase.Request,
                                         tx: Transaction.Context): Promise<AbandonRoomUseCase.Response> {
        const room = this.rooms.findById(r.roomId);
        Domain.require(room, 'ROOM_NOT_FOUND');
        const saved = await this.rooms.apply(room.end(r.actorId, true));
        return new AbandonRoomUseCase.Response(saved!.snapshot());
    }
}
