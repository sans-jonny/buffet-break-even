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
        return new GetRestaurantUseCase.Response(this.restaurants.getById(r.catalogScope, r.restaurantId));
    }
}
