import {Domain} from '../../../../kernel/domain/Domain';
import {RoomRestaurantPublisher} from '../../port/out/catalog/RoomRestaurantPublisher';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {Dining} from '../../dto/Dining';
import {SyncRoomRestaurantUseCase} from '../../port/in/catalog/SyncRoomRestaurantUseCase';
import {
    ReconcileConsumptionUseCase
} from '../../../../contexts/accounting/application/port/in/ReconcileConsumptionUseCase';
import {PublishRestaurantUseCase} from '../../../../contexts/catalog/application/port/in/PublishRestaurantUseCase';
import {ReplaceRoomRestaurantUseCase} from '../../../../contexts/catalog/application/port/in/ReplaceRoomRestaurantUseCase';
import {GetRestaurantUseCase} from '../../../../contexts/catalog/application/port/in/GetRestaurantUseCase';
import {GetRoomUseCase} from '../../../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {AuthorizeRoomUseCase} from '../../../../contexts/collaboration/application/port/in/AuthorizeRoomUseCase';
import {
    AuthorizeCatalogSyncUseCase
} from '../../../../contexts/collaboration/application/port/in/AuthorizeCatalogSyncUseCase';

export class SyncRoomRestaurantInteractor extends TransactionalInteractor<SyncRoomRestaurantUseCase.Request, SyncRoomRestaurantUseCase.Response> implements SyncRoomRestaurantUseCase {
    constructor(transactions: TransactionRunner,
                private readonly reconcileConsumption: ReconcileConsumptionUseCase,
                private readonly replaceRoomRestaurant: ReplaceRoomRestaurantUseCase,
                private readonly getRestaurant: GetRestaurantUseCase,
                private readonly publishRestaurant: PublishRestaurantUseCase,
                private readonly authorizeRoom: AuthorizeRoomUseCase,
                private readonly authorizeCatalogSync: AuthorizeCatalogSyncUseCase,
                private readonly getRoom: GetRoomUseCase,
                private readonly roomRestaurants: RoomRestaurantPublisher) {
        super(transactions, SyncRoomRestaurantUseCase.token);
    }

    protected async executeInTransaction(r: SyncRoomRestaurantUseCase.Request,
                                         tx: Transaction.Context): Promise<SyncRoomRestaurantUseCase.Response> {
        this.authorizeRoom.execute(new AuthorizeRoomUseCase.Request(r.roomId, r.actorId));
        let updated: Dining.Restaurant;
        if (r.original.type === 'PRIVATE') {
            this.authorizeCatalogSync.execute(new AuthorizeCatalogSyncUseCase.Request(r.roomId, r.actorId, r.original.id));
            await this.roomRestaurants.publishMedia?.(r.roomId, [r.original.id]);
            updated = (await this.replaceRoomRestaurant.execute(new ReplaceRoomRestaurantUseCase.Request(r.scope, r.roomId, r.original))).value;
        } else {
            const previous = this.getRestaurant.execute(new GetRestaurantUseCase.Request(r.roomId, r.original.id)).value;
            Domain.require(!previous || r.original.version > (previous.sourceVersion || previous.version), 'STALE_CATALOG_VERSION');
            updated = (await this.publishRestaurant.execute(new PublishRestaurantUseCase.Request(r.scope, r.roomId, {
                ...r.original,
                version: previous ? previous.version + 1 : 1,
                sourceVersion: r.original.version
            }))).value;
        }
        const room = this.getRoom.execute(new GetRoomUseCase.Request(r.roomId)).value;
        Domain.require(room, 'ROOM_NOT_FOUND');
        await this.reconcileConsumption.execute(new ReconcileConsumptionUseCase.Request(r.scope, room.activityId, updated));
        return new SyncRoomRestaurantUseCase.Response(updated);
    }
}
