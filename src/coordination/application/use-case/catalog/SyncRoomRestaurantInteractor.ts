import {Domain} from '../../../../kernel/domain/Domain';
import {RoomRestaurantPublisher} from '../../port/out/catalog/RoomRestaurantPublisher';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {SyncRoomRestaurantUseCase} from '../../port/in/catalog/SyncRoomRestaurantUseCase';
import {
    ReconcileConsumptionUseCase
} from '../../../../contexts/accounting/application/port/in/ReconcileConsumptionUseCase';
import {ReplaceRoomRestaurantUseCase} from '../../../../contexts/catalog/application/port/in/ReplaceRoomRestaurantUseCase';
import {GetRoomUseCase} from '../../../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {AuthorizeRoomUseCase} from '../../../../contexts/collaboration/application/port/in/AuthorizeRoomUseCase';
import {
    AuthorizeCatalogSyncUseCase
} from '../../../../contexts/collaboration/application/port/in/AuthorizeCatalogSyncUseCase';

export class SyncRoomRestaurantInteractor extends TransactionalInteractor<SyncRoomRestaurantUseCase.Request, SyncRoomRestaurantUseCase.Response> implements SyncRoomRestaurantUseCase {
    constructor(transactions: TransactionRunner,
                private readonly reconcileConsumption: ReconcileConsumptionUseCase,
                private readonly replaceRoomRestaurant: ReplaceRoomRestaurantUseCase,
                private readonly authorizeRoom: AuthorizeRoomUseCase,
                private readonly authorizeCatalogSync: AuthorizeCatalogSyncUseCase,
                private readonly getRoom: GetRoomUseCase,
                private readonly roomRestaurants: RoomRestaurantPublisher) {
        super(transactions, SyncRoomRestaurantUseCase.token);
    }

    protected async executeInTransaction(r: SyncRoomRestaurantUseCase.Request,
                                         tx: Transaction.Context): Promise<SyncRoomRestaurantUseCase.Response> {
        this.authorizeRoom.execute(new AuthorizeRoomUseCase.Request(r.roomId, r.actorId));
        Domain.require(r.original.type === 'PRIVATE', 'PRIVATE_ORIGINAL_REQUIRED');
        this.authorizeCatalogSync.execute(new AuthorizeCatalogSyncUseCase.Request(r.roomId, r.actorId, r.original.id));
        await this.roomRestaurants.publishMedia?.(r.roomId, [r.original.id]);
        const updated = (await this.replaceRoomRestaurant.execute(new ReplaceRoomRestaurantUseCase.Request(r.scope, r.roomId, r.original))).value;
        const room = this.getRoom.execute(new GetRoomUseCase.Request(r.roomId)).value;
        Domain.require(room, 'ROOM_NOT_FOUND');
        await this.reconcileConsumption.execute(new ReconcileConsumptionUseCase.Request(r.scope, room.activityId, updated));
        return new SyncRoomRestaurantUseCase.Response(updated);
    }
}
