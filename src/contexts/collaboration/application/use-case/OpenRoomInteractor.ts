import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {OpenRoomUseCase} from '../port/in/OpenRoomUseCase';
import {DiningRoom} from '../../domain/aggregate/DiningRoom';
import {DiningRoomRepository} from '../port/out/DiningRoomRepository';

export class OpenRoomInteractor extends TransactionalInteractor<OpenRoomUseCase.Request, OpenRoomUseCase.Response> implements OpenRoomUseCase {
    constructor(transactions: TransactionRunner, private readonly rooms: DiningRoomRepository) {
        super(transactions, OpenRoomUseCase.token);
    }

    protected async executeInTransaction(r: OpenRoomUseCase.Request,
                                         tx: Transaction.Context): Promise<OpenRoomUseCase.Response> {
        Domain.require(!this.rooms.all().some(a => a.id !== r.roomId && a.snapshot().status === 'ACTIVE' && a.snapshot().members.some(m => m.id === r.memberId && m.present)), 'ACTIVE_ROOM_EXISTS');
        Domain.require(!this.rooms.findById(r.roomId), 'ROOM_ALREADY_EXISTS');
        const saved = await this.rooms.apply(DiningRoom.create(r.roomId, r.code, r.activityId, r.memberId, r.nickname, r.sourceIds));
        return new OpenRoomUseCase.Response(saved!.snapshot());
    }
}
