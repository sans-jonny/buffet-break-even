import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {ClearRoundUseCase} from '../port/in/ClearRoundUseCase';
import {DiningActivityRepository} from '../port/out/DiningActivityRepository';
import {RestaurantConsumptionRepository} from '../port/out/RestaurantConsumptionRepository';

export class ClearRoundInteractor extends TransactionalInteractor<ClearRoundUseCase.Request, ClearRoundUseCase.Response> implements ClearRoundUseCase {
    constructor(transactions: TransactionRunner,
                private readonly activities: DiningActivityRepository,
                private readonly consumptions: RestaurantConsumptionRepository) {
        super(transactions, ClearRoundUseCase.token);
    }

    protected async executeInTransaction(r: ClearRoundUseCase.Request,
                                         tx: Transaction.Context): Promise<ClearRoundUseCase.Response> {
        const activity = this.activities.findById(r.activityId);
        Domain.require(activity, 'ACTIVITY_NOT_FOUND');
        Domain.require(activity.snapshot().status === 'ACTIVE', 'ALREADY_ENDED');
        const consumption = this.consumptions.findById(r.activityId + '/' + r.restaurantId);
        Domain.require(consumption, 'EMPTY_ROUND');
        const saved = await this.consumptions.apply(consumption.clearRound(r.roundId));
        return new ClearRoundUseCase.Response(saved!.snapshot());
    }
}
