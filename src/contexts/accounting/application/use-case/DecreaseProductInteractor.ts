import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {DecreaseProductUseCase} from '../port/in/DecreaseProductUseCase';
import {DiningActivityRepository} from '../port/out/DiningActivityRepository';
import {RestaurantConsumptionRepository} from '../port/out/RestaurantConsumptionRepository';

export class DecreaseProductInteractor extends TransactionalInteractor<DecreaseProductUseCase.Request, DecreaseProductUseCase.Response> implements DecreaseProductUseCase {
    constructor(transactions: TransactionRunner,
                private readonly activities: DiningActivityRepository,
                private readonly consumptions: RestaurantConsumptionRepository) {
        super(transactions, DecreaseProductUseCase.token);
    }

    protected async executeInTransaction(r: DecreaseProductUseCase.Request,
                                         tx: Transaction.Context): Promise<DecreaseProductUseCase.Response> {
        const activity = this.activities.findById(r.activityId);
        Domain.require(activity, 'ACTIVITY_NOT_FOUND');
        Domain.require(activity.snapshot().status === 'ACTIVE', 'ALREADY_ENDED');
        const consumption = this.consumptions.findById(r.activityId + '/' + r.restaurantId);
        Domain.require(consumption, 'EMPTY_ROUND');
        const saved = await this.consumptions.apply(consumption.decreaseProduct(r.roundId, r.productId, r.quantity));
        return new DecreaseProductUseCase.Response(saved!.snapshot());
    }
}
