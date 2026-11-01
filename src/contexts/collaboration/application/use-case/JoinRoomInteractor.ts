import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {JoinRoomUseCase} from '../port/in/JoinRoomUseCase';
import {DiningRoomRepository} from '../port/out/DiningRoomRepository';

export class JoinRoomInteractor extends TransactionalInteractor<JoinRoomUseCase.Request, JoinRoomUseCase.Response> implements JoinRoomUseCase {
    constructor(transactions: TransactionRunner, private readonly rooms: DiningRoomRepository) {
        super(transactions, JoinRoomUseCase.token);
    }

    protected async executeInTransaction(r: JoinRoomUseCase.Request,
                                         tx: Transaction.Context): Promise<JoinRoomUseCase.Response> {
        Domain.require(!this.rooms.all().some(a => a.id !== r.roomId && a.snapshot().status === 'ACTIVE' && a.snapshot().members.some(m => m.id === r.memberId && m.present)), 'ACTIVE_ROOM_EXISTS');
        const room = this.rooms.findById(r.roomId);
        Domain.require(room, 'ROOM_NOT_FOUND');
        const saved = await this.rooms.apply(room.join(r.memberId, r.nickname, r.joinedAt));
        return new JoinRoomUseCase.Response(saved!.snapshot());
    }
}
