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
        return new GetRoomUseCase.Response(this.rooms.getById(r.roomId));
    }
}
