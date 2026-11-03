import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {RemoveConsumptionItemUseCase} from '../port/in/RemoveConsumptionItemUseCase';
import {DiningActivityRepository} from '../port/out/DiningActivityRepository';
import {RestaurantConsumptionRepository} from '../port/out/RestaurantConsumptionRepository';

export class RemoveConsumptionItemInteractor extends TransactionalInteractor<RemoveConsumptionItemUseCase.Request, RemoveConsumptionItemUseCase.Response> implements RemoveConsumptionItemUseCase {
    constructor(transactions: TransactionRunner,
                private readonly activities: DiningActivityRepository,
                private readonly consumptions: RestaurantConsumptionRepository) {
        super(transactions, RemoveConsumptionItemUseCase.token);
    }

    protected async executeInTransaction(r: RemoveConsumptionItemUseCase.Request,
                                         tx: Transaction.Context): Promise<RemoveConsumptionItemUseCase.Response> {
        const activity = this.activities.findById(r.activityId);
        Domain.require(activity, 'ACTIVITY_NOT_FOUND');
        activity.authorizeActive();
        const consumption = this.consumptions.findById(r.activityId + '/' + r.restaurantId);
        Domain.require(consumption, 'EMPTY_ROUND');
        const saved = await this.consumptions.apply(consumption.removeProduct(r.roundId, r.productId));
        return new RemoveConsumptionItemUseCase.Response(saved!.snapshot());
    }
}
