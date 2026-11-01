import {ReadOnlyInteractor} from '../../../../kernel/application/ReadOnlyInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {ListRestaurantsUseCase} from '../port/in/ListRestaurantsUseCase';
import {RestaurantQuery} from '../port/out/RestaurantQuery';

export class ListRestaurantsInteractor extends ReadOnlyInteractor<ListRestaurantsUseCase.Request, ListRestaurantsUseCase.Response> implements ListRestaurantsUseCase {
    constructor(transactions: TransactionRunner, private readonly restaurants: RestaurantQuery) {
        super(transactions);
    }

    protected read(r: ListRestaurantsUseCase.Request, view?: Transaction.View): ListRestaurantsUseCase.Response {
        return new ListRestaurantsUseCase.Response(this.restaurants.list(r.catalogScope).filter(a => r.includeDeleted || !a.deleted));
    }
}
