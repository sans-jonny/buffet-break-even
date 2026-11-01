import {Domain} from '../../../../kernel/domain/Domain';
import {ReadOnlyInteractor} from '../../../../kernel/application/ReadOnlyInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {AuthorizeRoomUseCase} from '../port/in/AuthorizeRoomUseCase';
import {DiningRoom} from '../../domain/aggregate/DiningRoom';
import {RoomQuery} from '../port/out/RoomQuery';

export class AuthorizeRoomInteractor extends ReadOnlyInteractor<AuthorizeRoomUseCase.Request, AuthorizeRoomUseCase.Response> implements AuthorizeRoomUseCase {
    constructor(transactions: TransactionRunner, private readonly rooms: RoomQuery) {
        super(transactions);
    }

    protected read(r: AuthorizeRoomUseCase.Request, view?: Transaction.View): AuthorizeRoomUseCase.Response {
        const room = this.rooms.getById(r.roomId);
        Domain.require(room, 'ROOM_NOT_FOUND');
        DiningRoom.reconstitute(room).authorize(r.memberId, r.hostOnly);
        return new AuthorizeRoomUseCase.Response(undefined);
    }
}
