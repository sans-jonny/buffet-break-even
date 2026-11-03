import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {ReplaceRoomRestaurantUseCase} from '../port/in/ReplaceRoomRestaurantUseCase';
import {RestaurantRepository} from '../port/out/RestaurantRepository';

export class ReplaceRoomRestaurantInteractor extends TransactionalInteractor<ReplaceRoomRestaurantUseCase.Request, ReplaceRoomRestaurantUseCase.Response> implements ReplaceRoomRestaurantUseCase {
    constructor(transactions: TransactionRunner, private readonly restaurants: RestaurantRepository) {
        super(transactions, ReplaceRoomRestaurantUseCase.token);
    }

    protected async executeInTransaction(r: ReplaceRoomRestaurantUseCase.Request,
                                         tx: Transaction.Context): Promise<ReplaceRoomRestaurantUseCase.Response> {
        const copy = this.restaurants.findById(r.roomId, r.roomId + ':' + r.original.id);
        Domain.require(copy, 'RESTAURANT_NOT_FOUND');
        const saved = await this.restaurants.apply(r.roomId, copy.synchronizeFrom(r.original, r.roomId));
        return new ReplaceRoomRestaurantUseCase.Response(saved!.snapshot());
    }
}
