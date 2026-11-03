import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {CreateDiningActivityUseCase} from '../port/in/CreateDiningActivityUseCase';
import {DiningActivity} from '../../domain/aggregate/DiningActivity';
import {DiningActivityRepository} from '../port/out/DiningActivityRepository';
import {Money} from '../../domain/value-object/Money';

export class CreateDiningActivityInteractor extends TransactionalInteractor<CreateDiningActivityUseCase.Request, CreateDiningActivityUseCase.Response> implements CreateDiningActivityUseCase {
    constructor(transactions: TransactionRunner, private readonly activities: DiningActivityRepository) {
        super(transactions, CreateDiningActivityUseCase.token);
    }

    protected async executeInTransaction(r: CreateDiningActivityUseCase.Request,
                                         tx: Transaction.Context): Promise<CreateDiningActivityUseCase.Response> {
        const previous = DiningActivity.authorizeCreation(this.activities.all(), r.activityId, r.single, r.replaceActivityId);
        if (previous) await this.activities.apply(previous.abandon());
        const event = DiningActivity.create(r.activityId, Money.ofMinor(r.ticketPriceMinor), r.single ? 'SINGLE' : 'SHARED', r.restaurantIds, r.restaurantCategoryId);
        const saved = await this.activities.apply(event);
        return new CreateDiningActivityUseCase.Response(saved!.snapshot());
    }
}
