import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {DeleteRestaurantUseCase} from '../port/in/DeleteRestaurantUseCase';
import {RestaurantRepository} from '../port/out/RestaurantRepository';

export class DeleteRestaurantInteractor extends TransactionalInteractor<DeleteRestaurantUseCase.Request, DeleteRestaurantUseCase.Response> implements DeleteRestaurantUseCase {
    constructor(transactions: TransactionRunner, private readonly restaurants: RestaurantRepository) {
        super(transactions, DeleteRestaurantUseCase.token);
    }

    protected async executeInTransaction(r: DeleteRestaurantUseCase.Request,
                                         tx: Transaction.Context): Promise<DeleteRestaurantUseCase.Response> {
        const restaurant = this.restaurants.findById(r.catalogScope, r.restaurantId);
        Domain.require(restaurant, 'RESTAURANT_NOT_FOUND');
        const saved = await this.restaurants.apply(r.catalogScope, restaurant.delete());
        return new DeleteRestaurantUseCase.Response(saved!.snapshot());
    }
}
