import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {AbandonDiningActivityUseCase} from '../port/in/AbandonDiningActivityUseCase';
import {DiningActivityRepository} from '../port/out/DiningActivityRepository';

export class AbandonDiningActivityInteractor extends TransactionalInteractor<AbandonDiningActivityUseCase.Request, AbandonDiningActivityUseCase.Response> implements AbandonDiningActivityUseCase {
    constructor(transactions: TransactionRunner, private readonly activities: DiningActivityRepository) {
        super(transactions, AbandonDiningActivityUseCase.token);
    }

    protected async executeInTransaction(r: AbandonDiningActivityUseCase.Request,
                                         tx: Transaction.Context): Promise<AbandonDiningActivityUseCase.Response> {
        const activity = this.activities.findById(r.activityId);
        Domain.require(activity, 'ACTIVITY_NOT_FOUND');
        const saved = await this.activities.apply(activity.abandon());
        return new AbandonDiningActivityUseCase.Response(saved!.snapshot());
    }
}
