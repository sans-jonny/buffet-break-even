import {Domain} from '../../../../kernel/domain/Domain';
import {Restaurant} from '../../domain/aggregate/Restaurant';
import {ReadOnlyInteractor} from '../../../../kernel/application/ReadOnlyInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {GetRestaurantUseCase} from '../port/in/GetRestaurantUseCase';
import {RestaurantQuery} from '../port/out/RestaurantQuery';

export class GetRestaurantInteractor extends ReadOnlyInteractor<GetRestaurantUseCase.Request, GetRestaurantUseCase.Response> implements GetRestaurantUseCase {
    constructor(transactions: TransactionRunner, private readonly restaurants: RestaurantQuery) {
        super(transactions);
    }

    protected read(r: GetRestaurantUseCase.Request, view?: Transaction.View): GetRestaurantUseCase.Response {
        const value = this.restaurants.getById(r.catalogScope, r.restaurantId);
        if (r.context) {
            Domain.require(value, 'RESTAURANT_NOT_FOUND');
            const domain = Restaurant.reconstitute(value);
            if (r.context.available) domain.authorizeAvailable(r.context.productId);
            if (r.context.privateOnly) domain.authorizePrivate();
        }
        return new GetRestaurantUseCase.Response(value);
    }
}
