import {DiningAccess} from '../../service/DiningAccess';
import {Domain} from '../../../../kernel/domain/Domain';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {SubmitDiningRoundUseCase} from '../../port/in/dining/SubmitDiningRoundUseCase';
import {SubmitRoundUseCase} from '../../../../contexts/accounting/application/port/in/SubmitRoundUseCase';
import {GetConsumptionUseCase} from '../../../../contexts/accounting/application/port/in/GetConsumptionUseCase';

export class SubmitDiningRoundInteractor extends TransactionalInteractor<SubmitDiningRoundUseCase.Request, SubmitDiningRoundUseCase.Response> implements SubmitDiningRoundUseCase {
    constructor(transactions: TransactionRunner,
                private readonly access: DiningAccess,
                private readonly getConsumption: GetConsumptionUseCase,
                private readonly submitRound: SubmitRoundUseCase) {
        super(transactions, SubmitDiningRoundUseCase.token);
    }

    protected async executeInTransaction(r: SubmitDiningRoundUseCase.Request,
                                         tx: Transaction.Context): Promise<SubmitDiningRoundUseCase.Response> {
        this.access.requireHost(r.session, r.actorId);
        const consumption = this.getConsumption.execute(new GetConsumptionUseCase.Request(r.session.activityId, r.restaurantId)).value;
        const roundId = consumption?.rounds.find(a => a.status === 'ACTIVE')?.id;
        Domain.require(roundId, 'EMPTY_ROUND');
        await this.submitRound.execute(new SubmitRoundUseCase.Request(r.scope, r.session.activityId, r.restaurantId, roundId));
        return new SubmitDiningRoundUseCase.Response(undefined);
    }
}
