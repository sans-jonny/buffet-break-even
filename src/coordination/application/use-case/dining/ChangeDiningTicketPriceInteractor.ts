import {Domain} from '../../../../kernel/domain/Domain';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {ChangeDiningTicketPriceUseCase} from '../../port/in/dining/ChangeDiningTicketPriceUseCase';
import {ChangeTicketPriceUseCase} from '../../../../contexts/accounting/application/port/in/ChangeTicketPriceUseCase';
import {GetRoomUseCase} from '../../../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {AuthorizeRoomUseCase} from '../../../../contexts/collaboration/application/port/in/AuthorizeRoomUseCase';

export class ChangeDiningTicketPriceInteractor extends TransactionalInteractor<ChangeDiningTicketPriceUseCase.Request, ChangeDiningTicketPriceUseCase.Response> implements ChangeDiningTicketPriceUseCase {
    constructor(transactions: TransactionRunner,
                private readonly changeTicketPrice: ChangeTicketPriceUseCase,
                private readonly getRoom: GetRoomUseCase,
                private readonly authorizeRoom: AuthorizeRoomUseCase) {
        super(transactions, ChangeDiningTicketPriceUseCase.token);
    }

    protected async executeInTransaction(r: ChangeDiningTicketPriceUseCase.Request,
                                         tx: Transaction.Context): Promise<ChangeDiningTicketPriceUseCase.Response> {
        if (r.session.roomId) {
            const room = this.getRoom.execute(new GetRoomUseCase.Request(r.session.roomId)).value;
            Domain.require(room && room.activityId === r.session.activityId, 'ROOM_ACTIVITY_MISMATCH');
            this.authorizeRoom.execute(new AuthorizeRoomUseCase.Request(r.session.roomId, r.actorId, true));
        }
        await this.changeTicketPrice.execute(new ChangeTicketPriceUseCase.Request(r.scope, r.session.activityId, r.ticketPriceMinor));
        return new ChangeDiningTicketPriceUseCase.Response(undefined);
    }
}
