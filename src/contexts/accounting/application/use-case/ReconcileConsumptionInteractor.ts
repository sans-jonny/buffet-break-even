import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {ReconcileConsumptionUseCase} from '../port/in/ReconcileConsumptionUseCase';
import {DiningActivityRepository} from '../port/out/DiningActivityRepository';
import {RestaurantConsumptionRepository} from '../port/out/RestaurantConsumptionRepository';

export class ReconcileConsumptionInteractor extends TransactionalInteractor<ReconcileConsumptionUseCase.Request, ReconcileConsumptionUseCase.Response> implements ReconcileConsumptionUseCase {
    constructor(transactions: TransactionRunner,
                private readonly activities: DiningActivityRepository,
                private readonly consumptions: RestaurantConsumptionRepository) {
        super(transactions, ReconcileConsumptionUseCase.token);
    }

    protected async executeInTransaction(r: ReconcileConsumptionUseCase.Request,
                                         tx: Transaction.Context): Promise<ReconcileConsumptionUseCase.Response> {
        const activity = this.activities.findById(r.activityId);
        Domain.require(activity, 'ACTIVITY_NOT_FOUND');
        if (activity.snapshot().status !== 'ACTIVE')
            return new ReconcileConsumptionUseCase.Response(undefined);
        const consumption = this.consumptions.findById(r.activityId + '/' + r.catalog.id);
        if (consumption)
            await this.consumptions.apply(r.catalog.deleted ? consumption.discard() : consumption.retainProducts(r.catalog.products.map(p => p.id)));
        return new ReconcileConsumptionUseCase.Response(undefined);
    }
}
