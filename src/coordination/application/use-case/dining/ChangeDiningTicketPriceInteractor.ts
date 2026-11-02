import {DiningAccess} from '../../service/DiningAccess';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {ChangeDiningTicketPriceUseCase} from '../../port/in/dining/ChangeDiningTicketPriceUseCase';
import {ChangeTicketPriceUseCase} from '../../../../contexts/accounting/application/port/in/ChangeTicketPriceUseCase';

export class ChangeDiningTicketPriceInteractor extends TransactionalInteractor<ChangeDiningTicketPriceUseCase.Request, ChangeDiningTicketPriceUseCase.Response> implements ChangeDiningTicketPriceUseCase {
    constructor(transactions: TransactionRunner,
                private readonly access: DiningAccess,
                private readonly changeTicketPrice: ChangeTicketPriceUseCase) {
        super(transactions, ChangeDiningTicketPriceUseCase.token);
    }

    protected async executeInTransaction(r: ChangeDiningTicketPriceUseCase.Request,
                                         tx: Transaction.Context): Promise<ChangeDiningTicketPriceUseCase.Response> {
        this.access.requireHost(r.session, r.actorId);
        await this.changeTicketPrice.execute(new ChangeTicketPriceUseCase.Request(r.scope, r.session.activityId, r.ticketPriceMinor));
        return new ChangeDiningTicketPriceUseCase.Response(undefined);
    }
}
