import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {ChangeMemberNicknameUseCase} from '../port/in/ChangeMemberNicknameUseCase';
import {DiningRoomRepository} from '../port/out/DiningRoomRepository';

export class ChangeMemberNicknameInteractor extends TransactionalInteractor<ChangeMemberNicknameUseCase.Request, ChangeMemberNicknameUseCase.Response> implements ChangeMemberNicknameUseCase {
    constructor(transactions: TransactionRunner, private readonly rooms: DiningRoomRepository) {
        super(transactions, ChangeMemberNicknameUseCase.token);
    }

    protected async executeInTransaction(r: ChangeMemberNicknameUseCase.Request,
                                         tx: Transaction.Context): Promise<ChangeMemberNicknameUseCase.Response> {
        const room = this.rooms.findById(r.roomId);
        Domain.require(room, 'ROOM_NOT_FOUND');
        if (room.members.find(member => member.id === r.memberId)?.nickname === r.nickname.trim())
            return new ChangeMemberNicknameUseCase.Response(room.snapshot());
        const saved = await this.rooms.apply(room.changeNickname(r.memberId, r.nickname));
        return new ChangeMemberNicknameUseCase.Response(saved!.snapshot());
    }
}
