import {Domain} from '../../../../kernel/domain/Domain';
import {ReadOnlyInteractor} from '../../../../kernel/application/ReadOnlyInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {AuthorizeCatalogSyncUseCase} from '../port/in/AuthorizeCatalogSyncUseCase';
import {DiningRoom} from '../../domain/aggregate/DiningRoom';
import {RoomQuery} from '../port/out/RoomQuery';

export class AuthorizeCatalogSyncInteractor extends ReadOnlyInteractor<AuthorizeCatalogSyncUseCase.Request, AuthorizeCatalogSyncUseCase.Response> implements AuthorizeCatalogSyncUseCase {
    constructor(transactions: TransactionRunner, private readonly rooms: RoomQuery) {
        super(transactions);
    }

    protected read(r: AuthorizeCatalogSyncUseCase.Request,
                   view?: Transaction.View): AuthorizeCatalogSyncUseCase.Response {
        const room = this.rooms.getById(r.roomId);
        Domain.require(room, 'ROOM_NOT_FOUND');
        DiningRoom.reconstitute(room).authorizeCatalogSync(r.memberId, r.sourceId);
        return new AuthorizeCatalogSyncUseCase.Response(undefined);
    }
}
