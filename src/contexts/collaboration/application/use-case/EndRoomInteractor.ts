import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {EndRoomUseCase} from '../port/in/EndRoomUseCase';
import {DiningRoomRepository} from '../port/out/DiningRoomRepository';

export class EndRoomInteractor extends TransactionalInteractor<EndRoomUseCase.Request, EndRoomUseCase.Response> implements EndRoomUseCase {
    constructor(transactions: TransactionRunner, private readonly rooms: DiningRoomRepository) {
        super(transactions, EndRoomUseCase.token);
    }

    protected async executeInTransaction(r: EndRoomUseCase.Request,
                                         tx: Transaction.Context): Promise<EndRoomUseCase.Response> {
        const room = this.rooms.findById(r.roomId);
        Domain.require(room, 'ROOM_NOT_FOUND');
        const saved = await this.rooms.apply(room.end(r.actorId, false));
        return new EndRoomUseCase.Response(saved!.snapshot());
    }
}
