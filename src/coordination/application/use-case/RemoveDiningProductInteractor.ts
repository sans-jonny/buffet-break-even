import {Domain} from '../../../kernel/domain/Domain';
import {Transaction} from '../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../kernel/application/TransactionalInteractor';
import {RemoveDiningProductUseCase} from '../port/in/RemoveDiningProductUseCase';
import {CreateConsumptionUseCase} from '../../../contexts/accounting/application/port/in/CreateConsumptionUseCase';
import {
    RemoveConsumptionItemUseCase
} from '../../../contexts/accounting/application/port/in/RemoveConsumptionItemUseCase';
import {GetConsumptionUseCase} from '../../../contexts/accounting/application/port/in/GetConsumptionUseCase';
import {GetRestaurantUseCase} from '../../../contexts/catalog/application/port/in/GetRestaurantUseCase';
import {GetRoomUseCase} from '../../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {AuthorizeRoomUseCase} from '../../../contexts/collaboration/application/port/in/AuthorizeRoomUseCase';

export class RemoveDiningProductInteractor extends TransactionalInteractor<RemoveDiningProductUseCase.Request, RemoveDiningProductUseCase.Response> implements RemoveDiningProductUseCase {
    constructor(transactions: TransactionRunner,
                private readonly getConsumption: GetConsumptionUseCase,
                private readonly createConsumption: CreateConsumptionUseCase,
                private readonly removeConsumptionItem: RemoveConsumptionItemUseCase,
                private readonly getRestaurant: GetRestaurantUseCase,
                private readonly getRoom: GetRoomUseCase,
                private readonly authorizeRoom: AuthorizeRoomUseCase,
                private readonly id: () => string) {
        super(transactions, RemoveDiningProductUseCase.token);
    }

    protected async executeInTransaction(r: RemoveDiningProductUseCase.Request,
                                         tx: Transaction.Context): Promise<RemoveDiningProductUseCase.Response> {
        if (r.session.roomId) {
            const room = this.getRoom.execute(new GetRoomUseCase.Request(r.session.roomId)).value;
            Domain.require(room && room.activityId === r.session.activityId, 'ROOM_ACTIVITY_MISMATCH');
            this.authorizeRoom.execute(new AuthorizeRoomUseCase.Request(r.session.roomId, r.actorId, false));
        }
        const catalog = this.getRestaurant.execute(new GetRestaurantUseCase.Request(r.session.roomId || 'local', r.restaurantId)).value;
        Domain.require(catalog, 'RESTAURANT_NOT_FOUND');
        Domain.require(!catalog.deleted, 'RESTAURANT_UNAVAILABLE');
        let consumption = this.getConsumption.execute(new GetConsumptionUseCase.Request(r.session.activityId, r.restaurantId)).value;
        if (!consumption)
            consumption = (await this.createConsumption.execute(new CreateConsumptionUseCase.Request(r.scope, r.session.activityId, r.restaurantId, this.id()))).value;
        const roundId = consumption.rounds.find(a => a.status === 'ACTIVE')?.id;
        Domain.require(roundId, 'ROUND_LOCKED');
        await this.removeConsumptionItem.execute(new RemoveConsumptionItemUseCase.Request(r.scope, r.session.activityId, r.restaurantId, roundId, r.productId));
        return new RemoveDiningProductUseCase.Response(undefined);
    }
}
