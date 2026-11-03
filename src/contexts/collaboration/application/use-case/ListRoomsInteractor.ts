import {ReadOnlyInteractor} from '../../../../kernel/application/ReadOnlyInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {ListRoomsUseCase} from '../port/in/ListRoomsUseCase';
import {RoomQuery} from '../port/out/RoomQuery';

export class ListRoomsInteractor extends ReadOnlyInteractor<ListRoomsUseCase.Request, ListRoomsUseCase.Response> implements ListRoomsUseCase {
    constructor(transactions: TransactionRunner, private readonly rooms: RoomQuery) {
        super(transactions);
    }

    protected read(r: ListRoomsUseCase.Request, view?: Transaction.View): ListRoomsUseCase.Response {
        return new ListRoomsUseCase.Response(this.rooms.list());
    }
}
