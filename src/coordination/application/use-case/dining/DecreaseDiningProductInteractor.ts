import {DiningAccess} from '../../service/DiningAccess';
import {EditableDiningRound} from '../../service/EditableDiningRound';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {DecreaseDiningProductUseCase} from '../../port/in/dining/DecreaseDiningProductUseCase';
import {DecreaseProductUseCase} from '../../../../contexts/accounting/application/port/in/DecreaseProductUseCase';

export class DecreaseDiningProductInteractor extends TransactionalInteractor<DecreaseDiningProductUseCase.Request, DecreaseDiningProductUseCase.Response> implements DecreaseDiningProductUseCase {
    constructor(transactions: TransactionRunner,
                private readonly access: DiningAccess,
                private readonly rounds: EditableDiningRound,
                private readonly decreaseProduct: DecreaseProductUseCase) {
        super(transactions, DecreaseDiningProductUseCase.token);
    }

    protected async executeInTransaction(r: DecreaseDiningProductUseCase.Request,
                                         tx: Transaction.Context): Promise<DecreaseDiningProductUseCase.Response> {
        this.access.requireEditable(r.session, r.actorId);
        const roundId = await this.rounds.prepare(r.session, r.restaurantId);
        await this.decreaseProduct.execute(new DecreaseProductUseCase.Request(r.scope, r.session.activityId, r.restaurantId, roundId, r.productId, r.quantity));
        return new DecreaseDiningProductUseCase.Response(undefined);
    }
}
