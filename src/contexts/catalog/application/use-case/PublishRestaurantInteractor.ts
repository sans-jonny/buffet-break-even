import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {PublishRestaurantUseCase} from '../port/in/PublishRestaurantUseCase';
import {Restaurant} from '../../domain/aggregate/Restaurant';
import {RestaurantRepository} from '../port/out/RestaurantRepository';

export class PublishRestaurantInteractor extends TransactionalInteractor<PublishRestaurantUseCase.Request, PublishRestaurantUseCase.Response> implements PublishRestaurantUseCase {
    constructor(transactions: TransactionRunner, private readonly restaurants: RestaurantRepository) {
        super(transactions, PublishRestaurantUseCase.token);
    }

    protected async executeInTransaction(r: PublishRestaurantUseCase.Request,
                                         tx: Transaction.Context): Promise<PublishRestaurantUseCase.Response> {
        const previous = this.restaurants.findById(r.catalogScope, r.restaurant.id);
        Restaurant.authorizeVersion(r.restaurant.version, previous);
        const saved = await this.restaurants.apply(r.catalogScope, Restaurant.publish(r.restaurant));
        return new PublishRestaurantUseCase.Response(saved!.snapshot());
    }
}
