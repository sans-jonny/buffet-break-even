import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {EndDiningActivityUseCase} from '../port/in/EndDiningActivityUseCase';
import {DiningActivityRepository} from '../port/out/DiningActivityRepository';
import {RestaurantConsumptionRepository} from '../port/out/RestaurantConsumptionRepository';
import {DiningResult} from '../../domain/value-object/DiningResult';
import {ConsumptionCalculator} from '../../domain/service/ConsumptionCalculator';

export class EndDiningActivityInteractor extends TransactionalInteractor<EndDiningActivityUseCase.Request, EndDiningActivityUseCase.Response> implements EndDiningActivityUseCase {
    constructor(transactions: TransactionRunner,
                private readonly activities: DiningActivityRepository,
                private readonly consumptions: RestaurantConsumptionRepository) {
        super(transactions, EndDiningActivityUseCase.token);
    }

    protected async executeInTransaction(r: EndDiningActivityUseCase.Request,
                                         tx: Transaction.Context): Promise<EndDiningActivityUseCase.Response> {
        const activity = this.activities.findById(r.activityId);
        Domain.require(activity, 'ACTIVITY_NOT_FOUND');
        Domain.require(activity.snapshot().status === 'ACTIVE', 'ALREADY_ENDED');
        const consumption = this.consumptions.findById(r.activityId + '/' + r.catalog.id);
        const result = ConsumptionCalculator.calculate(activity.snapshot(), consumption?.snapshot(), r.catalog, r.date, r.diners);
        if (consumption)
            await this.consumptions.apply(consumption.finalize());
        await this.activities.apply(activity.end(DiningResult.create(result)));
        return new EndDiningActivityUseCase.Response(result);
    }
}
