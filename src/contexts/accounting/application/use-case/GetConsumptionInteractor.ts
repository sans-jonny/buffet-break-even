import {ReadOnlyInteractor} from '../../../../kernel/application/ReadOnlyInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {GetConsumptionUseCase} from '../port/in/GetConsumptionUseCase';
import {ConsumptionQuery} from '../port/out/ConsumptionQuery';

export class GetConsumptionInteractor extends ReadOnlyInteractor<GetConsumptionUseCase.Request, GetConsumptionUseCase.Response> implements GetConsumptionUseCase {
    constructor(transactions: TransactionRunner, private readonly consumptions: ConsumptionQuery) {
        super(transactions);
    }

    protected read(r: GetConsumptionUseCase.Request, view?: Transaction.View): GetConsumptionUseCase.Response {
        return new GetConsumptionUseCase.Response(this.consumptions.getById(r.activityId + '/' + r.restaurantId));
    }
}
