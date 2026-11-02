import {DiningAccess} from '../../service/DiningAccess';
import {EditableDiningRound} from '../../service/EditableDiningRound';
import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {RemoveDiningProductUseCase} from '../../port/in/dining/RemoveDiningProductUseCase';
import {
    RemoveConsumptionItemUseCase
} from '../../../../contexts/accounting/application/port/in/RemoveConsumptionItemUseCase';

export class RemoveDiningProductInteractor extends TransactionalInteractor<RemoveDiningProductUseCase.Request, RemoveDiningProductUseCase.Response> implements RemoveDiningProductUseCase {
    constructor(transactions: TransactionRunner,
                private readonly access: DiningAccess,
                private readonly rounds: EditableDiningRound,
                private readonly removeConsumptionItem: RemoveConsumptionItemUseCase) {
        super(transactions, RemoveDiningProductUseCase.token);
    }

    protected async executeInTransaction(r: RemoveDiningProductUseCase.Request,
                                         tx: Transaction.Context): Promise<RemoveDiningProductUseCase.Response> {
        this.access.requireEditable(r.session, r.actorId);
        const roundId = await this.rounds.prepare(r.session, r.restaurantId);
        await this.removeConsumptionItem.execute(new RemoveConsumptionItemUseCase.Request(r.scope, r.session.activityId, r.restaurantId, roundId, r.productId));
        return new RemoveDiningProductUseCase.Response(undefined);
    }
}
