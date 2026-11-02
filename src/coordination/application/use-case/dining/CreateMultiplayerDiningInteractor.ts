import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {CreateMultiplayerDiningUseCase} from '../../port/in/dining/CreateMultiplayerDiningUseCase';
import {
    CreateDiningActivityUseCase
} from '../../../../contexts/accounting/application/port/in/CreateDiningActivityUseCase';
import {RoomRestaurantPublisher} from '../../port/out/catalog/RoomRestaurantPublisher';
import {Domain} from '../../../../kernel/domain/Domain';
import {ListRestaurantsUseCase} from '../../../../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import {OpenRoomUseCase} from '../../../../contexts/collaboration/application/port/in/OpenRoomUseCase';

export class CreateMultiplayerDiningInteractor extends TransactionalInteractor<CreateMultiplayerDiningUseCase.Request, CreateMultiplayerDiningUseCase.Response> implements CreateMultiplayerDiningUseCase {
    constructor(transactions: TransactionRunner,
                private readonly createDiningActivity: CreateDiningActivityUseCase,
                private readonly listRestaurants: ListRestaurantsUseCase,
                private readonly roomRestaurants: RoomRestaurantPublisher,
                private readonly openRoom: OpenRoomUseCase) {
        super(transactions, CreateMultiplayerDiningUseCase.token);
    }

    protected async executeInTransaction(r: CreateMultiplayerDiningUseCase.Request,
                                         tx: Transaction.Context): Promise<CreateMultiplayerDiningUseCase.Response> {
        const originals = this.listRestaurants.execute(new ListRestaurantsUseCase.Request('local')).value
            .filter(restaurant => restaurant.restaurantCategory.id === r.categoryId);
        Domain.require(originals.length, 'RESTAURANT_CATEGORY_EMPTY');
        await this.openRoom.execute(new OpenRoomUseCase.Request(r.scope, r.roomId, r.code, r.activityId, r.creator.id, r.creator.nickname, originals.filter(a => a.type === 'PRIVATE').map(a => a.id)));
        await this.createDiningActivity.execute(new CreateDiningActivityUseCase.Request(r.scope, r.activityId, r.ticketPriceMinor, false, originals.map(restaurant => restaurant.type === 'PRIVATE' ? `${r.roomId}:${restaurant.id}` : restaurant.id), r.categoryId));
        await this.roomRestaurants.publish(r.roomId, originals.filter(restaurant => restaurant.type === 'PRIVATE').map(restaurant => restaurant.id));
        return new CreateMultiplayerDiningUseCase.Response({...r.scope, activityId: r.activityId});
    }
}
