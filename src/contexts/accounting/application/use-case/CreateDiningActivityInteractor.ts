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
        Domain.require(!this.activities.findById(r.activityId), 'ACTIVITY_ALREADY_EXISTS');
        if (r.replaceActivityId) {
            const previous = this.activities.findById(r.replaceActivityId);
            Domain.require(r.single && previous?.mode === 'SINGLE' && previous.status === 'ACTIVE', 'INVALID_SINGLE_REPLACEMENT');
            await this.activities.apply(previous.abandon());
        }
        if (r.single)
            Domain.require(!this.activities.all().some(a => a.snapshot().mode === 'SINGLE' && a.snapshot().status === 'ACTIVE'), 'SINGLE_ACTIVITY_EXISTS');
        const event = DiningActivity.create(r.activityId, Money.ofMinor(r.ticketPriceMinor), r.single ? 'SINGLE' : 'SHARED', r.restaurantIds, r.restaurantCategoryId);
        const saved = await this.activities.apply(event);
        return new CreateDiningActivityUseCase.Response(saved!.snapshot());
    }
}
