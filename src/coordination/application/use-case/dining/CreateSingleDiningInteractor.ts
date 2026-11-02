import {Domain} from '../../../../kernel/domain/Domain';
import {ListRestaurantsUseCase} from '../../../../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {CreateSingleDiningUseCase} from '../../port/in/dining/CreateSingleDiningUseCase';
import {
    CreateDiningActivityUseCase
} from '../../../../contexts/accounting/application/port/in/CreateDiningActivityUseCase';

export class CreateSingleDiningInteractor extends TransactionalInteractor<CreateSingleDiningUseCase.Request, CreateSingleDiningUseCase.Response> implements CreateSingleDiningUseCase {
    constructor(transactions: TransactionRunner, private readonly createDiningActivity: CreateDiningActivityUseCase,
                private readonly restaurants: ListRestaurantsUseCase) {
        super(transactions, CreateSingleDiningUseCase.token);
    }

    protected async executeInTransaction(r: CreateSingleDiningUseCase.Request,
                                         tx: Transaction.Context): Promise<CreateSingleDiningUseCase.Response> {
        const selected = this.restaurants.execute(new ListRestaurantsUseCase.Request('local', false, r.categoryId)).value;
        await this.createDiningActivity.execute(new CreateDiningActivityUseCase.Request(r.scope, r.activityId, r.ticketPriceMinor, true, selected.map(restaurant => restaurant.id), r.categoryId, r.replaceActivityId));
        return new CreateSingleDiningUseCase.Response({...r.scope, activityId: r.activityId});
    }
}
