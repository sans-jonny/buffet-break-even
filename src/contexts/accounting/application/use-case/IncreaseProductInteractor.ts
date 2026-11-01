import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {IncreaseProductUseCase} from '../port/in/IncreaseProductUseCase';
import {DiningActivityRepository} from '../port/out/DiningActivityRepository';
import {RestaurantConsumptionRepository} from '../port/out/RestaurantConsumptionRepository';

export class IncreaseProductInteractor extends TransactionalInteractor<IncreaseProductUseCase.Request, IncreaseProductUseCase.Response> implements IncreaseProductUseCase {
    constructor(transactions: TransactionRunner,
                private readonly activities: DiningActivityRepository,
                private readonly consumptions: RestaurantConsumptionRepository) {
        super(transactions, IncreaseProductUseCase.token);
    }

    protected async executeInTransaction(r: IncreaseProductUseCase.Request,
                                         tx: Transaction.Context): Promise<IncreaseProductUseCase.Response> {
        const activity = this.activities.findById(r.activityId);
        Domain.require(activity, 'ACTIVITY_NOT_FOUND');
        Domain.require(activity.snapshot().status === 'ACTIVE', 'ALREADY_ENDED');
        const consumption = this.consumptions.findById(r.activityId + '/' + r.restaurantId);
        Domain.require(consumption, 'EMPTY_ROUND');
        const saved = await this.consumptions.apply(consumption.increaseProduct(r.roundId, r.productId, r.quantity));
        return new IncreaseProductUseCase.Response(saved!.snapshot());
    }
}
