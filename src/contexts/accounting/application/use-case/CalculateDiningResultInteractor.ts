import {DiningActivity} from '../../domain/aggregate/DiningActivity';
import {Domain} from '../../../../kernel/domain/Domain';
import {ReadOnlyInteractor} from '../../../../kernel/application/ReadOnlyInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {CalculateDiningResultUseCase} from '../port/in/CalculateDiningResultUseCase';
import {DiningActivityQuery} from '../port/out/DiningActivityQuery';
import {ConsumptionQuery} from '../port/out/ConsumptionQuery';
import {ConsumptionCalculator} from '../../domain/service/ConsumptionCalculator';

export class CalculateDiningResultInteractor extends ReadOnlyInteractor<CalculateDiningResultUseCase.Request, CalculateDiningResultUseCase.Response> implements CalculateDiningResultUseCase {
    constructor(transactions: TransactionRunner,
                private readonly activities: DiningActivityQuery,
                private readonly consumptions: ConsumptionQuery) {
        super(transactions);
    }

    protected read(r: CalculateDiningResultUseCase.Request,
                   view?: Transaction.View): CalculateDiningResultUseCase.Response {
        const activity = this.activities.getById(r.activityId);
        Domain.require(activity, 'ACTIVITY_NOT_FOUND');
        DiningActivity.reconstitute(activity).authorizeRestaurant(r.catalog.id);
        return new CalculateDiningResultUseCase.Response(activity.result || ConsumptionCalculator.calculate(activity, this.consumptions.getById(r.activityId + '/' + r.catalog.id), r.catalog, r.date, r.diners));
    }
}
