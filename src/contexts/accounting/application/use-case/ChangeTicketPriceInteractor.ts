import {Domain} from '../../../../kernel/domain/Domain';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {ChangeTicketPriceUseCase} from '../port/in/ChangeTicketPriceUseCase';
import {DiningActivityRepository} from '../port/out/DiningActivityRepository';
import {Money} from '../../domain/value-object/Money';

export class ChangeTicketPriceInteractor extends TransactionalInteractor<ChangeTicketPriceUseCase.Request, ChangeTicketPriceUseCase.Response> implements ChangeTicketPriceUseCase {
    constructor(transactions: TransactionRunner, private readonly activities: DiningActivityRepository) {
        super(transactions, ChangeTicketPriceUseCase.token);
    }

    protected async executeInTransaction(r: ChangeTicketPriceUseCase.Request,
                                         tx: Transaction.Context): Promise<ChangeTicketPriceUseCase.Response> {
        const activity = this.activities.findById(r.activityId);
        Domain.require(activity, 'ACTIVITY_NOT_FOUND');
        Domain.require(activity.snapshot().status === 'ACTIVE', 'ALREADY_ENDED');
        const saved = await this.activities.apply(activity.changeTicketPrice(Money.ofMinor(r.ticketPriceMinor)));
        return new ChangeTicketPriceUseCase.Response(saved!.snapshot());
    }
}
