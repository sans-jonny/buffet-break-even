import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {CreateConsumptionUseCase} from '../port/in/CreateConsumptionUseCase';
import {DiningActivityRepository} from '../port/out/DiningActivityRepository';
import {RestaurantConsumption} from '../../domain/aggregate/RestaurantConsumption';
import {RestaurantConsumptionRepository} from '../port/out/RestaurantConsumptionRepository';

export class CreateConsumptionInteractor extends TransactionalInteractor<CreateConsumptionUseCase.Request, CreateConsumptionUseCase.Response> implements CreateConsumptionUseCase {
    constructor(transactions: TransactionRunner,
                private readonly activities: DiningActivityRepository,
                private readonly consumptions: RestaurantConsumptionRepository) {
        super(transactions, CreateConsumptionUseCase.token);
    }

    protected async executeInTransaction(r: CreateConsumptionUseCase.Request,
                                         tx: Transaction.Context): Promise<CreateConsumptionUseCase.Response> {
        const activity = this.activities.findById(r.activityId);
        Domain.require(activity, 'ACTIVITY_NOT_FOUND');
        activity.authorizeActive();
        activity.authorizeRestaurant(r.restaurantId);
        Domain.require(!this.consumptions.findById(r.activityId + '/' + r.restaurantId), 'CONSUMPTION_ALREADY_EXISTS');
        const saved = await this.consumptions.apply(RestaurantConsumption.create(r.activityId, r.restaurantId, r.roundId));
        return new CreateConsumptionUseCase.Response(saved!.snapshot());
    }
}
