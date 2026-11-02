import {DiningAccess} from '../../service/DiningAccess';
import {EditableDiningRound} from '../../service/EditableDiningRound';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {ClearDiningRoundUseCase} from '../../port/in/dining/ClearDiningRoundUseCase';
import {ClearRoundUseCase} from '../../../../contexts/accounting/application/port/in/ClearRoundUseCase';

export class ClearDiningRoundInteractor extends TransactionalInteractor<ClearDiningRoundUseCase.Request, ClearDiningRoundUseCase.Response> implements ClearDiningRoundUseCase {
    constructor(transactions: TransactionRunner,
                private readonly access: DiningAccess,
                private readonly rounds: EditableDiningRound,
                private readonly clearRound: ClearRoundUseCase) {
        super(transactions, ClearDiningRoundUseCase.token);
    }

    protected async executeInTransaction(r: ClearDiningRoundUseCase.Request,
                                         tx: Transaction.Context): Promise<ClearDiningRoundUseCase.Response> {
        this.access.requireEditable(r.session, r.actorId);
        const roundId = await this.rounds.prepare(r.session, r.restaurantId);
        await this.clearRound.execute(new ClearRoundUseCase.Request(r.scope, r.session.activityId, r.restaurantId, roundId));
        return new ClearDiningRoundUseCase.Response(undefined);
    }
}
