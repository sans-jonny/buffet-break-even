import {Domain} from '../../../../kernel/domain/Domain';
import {DiningRoom} from '../../domain/aggregate/DiningRoom';
import {ReadOnlyInteractor} from '../../../../kernel/application/ReadOnlyInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {GetRoomUseCase} from '../port/in/GetRoomUseCase';
import {RoomQuery} from '../port/out/RoomQuery';

export class GetRoomInteractor extends ReadOnlyInteractor<GetRoomUseCase.Request, GetRoomUseCase.Response> implements GetRoomUseCase {
    constructor(transactions: TransactionRunner, private readonly rooms: RoomQuery) {
        super(transactions);
    }

    protected read(r: GetRoomUseCase.Request, view?: Transaction.View): GetRoomUseCase.Response {
        const value = this.rooms.getById(r.roomId);
        if (r.context) {
            Domain.require(value, 'ROOM_NOT_FOUND');
            const domain = DiningRoom.reconstitute(value);
            domain.authorizeContext(r.context);
        }
        return new GetRoomUseCase.Response(value);
    }
}
