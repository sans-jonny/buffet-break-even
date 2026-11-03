import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {SubmitRoundUseCase} from '../port/in/SubmitRoundUseCase';
import {DiningActivityRepository} from '../port/out/DiningActivityRepository';
import {RestaurantConsumptionRepository} from '../port/out/RestaurantConsumptionRepository';

export class SubmitRoundInteractor extends TransactionalInteractor<SubmitRoundUseCase.Request, SubmitRoundUseCase.Response> implements SubmitRoundUseCase {
    constructor(transactions: TransactionRunner,
                private readonly activities: DiningActivityRepository,
                private readonly consumptions: RestaurantConsumptionRepository,
                private readonly id: () => string) {
        super(transactions, SubmitRoundUseCase.token);
    }

    protected async executeInTransaction(r: SubmitRoundUseCase.Request,
                                         tx: Transaction.Context): Promise<SubmitRoundUseCase.Response> {
        const activity = this.activities.findById(r.activityId);
        Domain.require(activity, 'ACTIVITY_NOT_FOUND');
        activity.authorizeActive();
        const consumption = this.consumptions.findById(r.activityId + '/' + r.restaurantId);
        Domain.require(consumption, 'EMPTY_ROUND');
        await this.consumptions.apply(consumption.submitRound(r.roundId));
        const updated = this.consumptions.findById(consumption.id)!;
        const saved = await this.consumptions.apply(updated.createNextRound(this.id()));
        return new SubmitRoundUseCase.Response(saved!.snapshot());
    }
}
