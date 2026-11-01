import {Domain} from '../../../kernel/domain/Domain';
import {Transaction} from '../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../kernel/application/TransactionalInteractor';
import {SubmitDiningRoundUseCase} from '../port/in/SubmitDiningRoundUseCase';
import {SubmitRoundUseCase} from '../../../contexts/accounting/application/port/in/SubmitRoundUseCase';
import {GetConsumptionUseCase} from '../../../contexts/accounting/application/port/in/GetConsumptionUseCase';
import {GetRoomUseCase} from '../../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {AuthorizeRoomUseCase} from '../../../contexts/collaboration/application/port/in/AuthorizeRoomUseCase';

export class SubmitDiningRoundInteractor extends TransactionalInteractor<SubmitDiningRoundUseCase.Request, SubmitDiningRoundUseCase.Response> implements SubmitDiningRoundUseCase {
    constructor(transactions: TransactionRunner,
                private readonly getConsumption: GetConsumptionUseCase,
                private readonly submitRound: SubmitRoundUseCase,
                private readonly getRoom: GetRoomUseCase,
                private readonly authorizeRoom: AuthorizeRoomUseCase) {
        super(transactions, SubmitDiningRoundUseCase.token);
    }

    protected async executeInTransaction(r: SubmitDiningRoundUseCase.Request,
                                         tx: Transaction.Context): Promise<SubmitDiningRoundUseCase.Response> {
        if (r.session.roomId) {
            const room = this.getRoom.execute(new GetRoomUseCase.Request(r.session.roomId)).value;
            Domain.require(room && room.activityId === r.session.activityId, 'ROOM_ACTIVITY_MISMATCH');
            this.authorizeRoom.execute(new AuthorizeRoomUseCase.Request(r.session.roomId, r.actorId, true));
        }
        let consumption = this.getConsumption.execute(new GetConsumptionUseCase.Request(r.session.activityId, r.restaurantId)).value;
        const roundId = consumption?.rounds.find(a => a.status === 'ACTIVE')?.id;
        Domain.require(roundId, 'EMPTY_ROUND');
        await this.submitRound.execute(new SubmitRoundUseCase.Request(r.scope, r.session.activityId, r.restaurantId, roundId));
        return new SubmitDiningRoundUseCase.Response(undefined);
    }
}
