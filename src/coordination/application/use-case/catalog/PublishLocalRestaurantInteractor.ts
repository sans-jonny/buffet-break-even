import {Domain} from '../../../../kernel/domain/Domain';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {PublishLocalRestaurantUseCase} from '../../port/in/catalog/PublishLocalRestaurantUseCase';
import {
    ReconcileConsumptionUseCase
} from '../../../../contexts/accounting/application/port/in/ReconcileConsumptionUseCase';
import {
    ListDiningActivitiesUseCase
} from '../../../../contexts/accounting/application/port/in/ListDiningActivitiesUseCase';
import {PublishRestaurantUseCase} from '../../../../contexts/catalog/application/port/in/PublishRestaurantUseCase';

export class PublishLocalRestaurantInteractor extends TransactionalInteractor<PublishLocalRestaurantUseCase.Request, PublishLocalRestaurantUseCase.Response> implements PublishLocalRestaurantUseCase {
    constructor(transactions: TransactionRunner,
                private readonly listDiningActivities: ListDiningActivitiesUseCase,
                private readonly reconcileConsumption: ReconcileConsumptionUseCase,
                private readonly publishRestaurant: PublishRestaurantUseCase) {
        super(transactions, PublishLocalRestaurantUseCase.token);
    }

    protected async executeInTransaction(r: PublishLocalRestaurantUseCase.Request,
                                         tx: Transaction.Context): Promise<PublishLocalRestaurantUseCase.Response> {
        Domain.require(r.restaurant.type === 'PRIVATE' || r.restaurant.type === 'PUBLIC', 'ORIGINAL_REQUIRED');
        const updated = (await this.publishRestaurant.execute(new PublishRestaurantUseCase.Request(r.scope, 'local', r.restaurant))).value;
        for (const activity of this.listDiningActivities.execute(new ListDiningActivitiesUseCase.Request()).value) {
            if (activity.mode === 'SINGLE' && activity.status === 'ACTIVE')
                await this.reconcileConsumption.execute(new ReconcileConsumptionUseCase.Request(r.scope, activity.id, updated));
        }
        return new PublishLocalRestaurantUseCase.Response(updated);
    }
}
