import {DiningAccess} from '../../service/DiningAccess';
import {EditableDiningRound} from '../../service/EditableDiningRound';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {IncreaseDiningProductUseCase} from '../../port/in/dining/IncreaseDiningProductUseCase';
import {IncreaseProductUseCase} from '../../../../contexts/accounting/application/port/in/IncreaseProductUseCase';

export class IncreaseDiningProductInteractor extends TransactionalInteractor<IncreaseDiningProductUseCase.Request, IncreaseDiningProductUseCase.Response> implements IncreaseDiningProductUseCase {
    constructor(transactions: TransactionRunner,
                private readonly access: DiningAccess,
                private readonly rounds: EditableDiningRound,
                private readonly increaseProduct: IncreaseProductUseCase) {
        super(transactions, IncreaseDiningProductUseCase.token);
    }

    protected async executeInTransaction(r: IncreaseDiningProductUseCase.Request,
                                         tx: Transaction.Context): Promise<IncreaseDiningProductUseCase.Response> {
        this.access.requireEditable(r.session, r.actorId);
        const roundId = await this.rounds.prepare(r.session, r.restaurantId, r.productId);
        await this.increaseProduct.execute(new IncreaseProductUseCase.Request(r.scope, r.session.activityId, r.restaurantId, roundId, r.productId, r.quantity));
        return new IncreaseDiningProductUseCase.Response(undefined);
    }
}
