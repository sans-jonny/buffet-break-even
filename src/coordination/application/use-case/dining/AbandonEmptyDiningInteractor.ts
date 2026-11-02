import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {Transaction} from '../../../../kernel/application/Transaction';
import {AbandonEmptyDiningUseCase} from '../../port/in/dining/AbandonEmptyDiningUseCase';
import {AbandonDiningUseCase} from '../../port/in/dining/AbandonDiningUseCase';
import {GetDiningActivityUseCase} from '../../../../contexts/accounting/application/port/in/GetDiningActivityUseCase';
import {GetConsumptionUseCase} from '../../../../contexts/accounting/application/port/in/GetConsumptionUseCase';
import {ListRestaurantsUseCase} from '../../../../contexts/catalog/application/port/in/ListRestaurantsUseCase';

/** Check all restaurant drafts; only empty single-player dining is abandoned on exit. */
export class AbandonEmptyDiningInteractor extends TransactionalInteractor<AbandonEmptyDiningUseCase.Request, AbandonEmptyDiningUseCase.Response> implements AbandonEmptyDiningUseCase {
    constructor(transactions: TransactionRunner, private readonly activities: GetDiningActivityUseCase,
                private readonly restaurants: ListRestaurantsUseCase, private readonly consumption: GetConsumptionUseCase,
                private readonly abandon: AbandonDiningUseCase) {
        super(transactions, AbandonEmptyDiningUseCase.token);
    }
    protected async executeInTransaction(r: AbandonEmptyDiningUseCase.Request, _tx: Transaction.Context): Promise<AbandonEmptyDiningUseCase.Response> {
        const activity = this.activities.execute(new GetDiningActivityUseCase.Request(r.session.activityId)).value;
        if (activity?.status === 'ABANDONED') return new AbandonEmptyDiningUseCase.Response(true);
        if (activity?.status !== 'ACTIVE') return new AbandonEmptyDiningUseCase.Response(false);
        const ids = new Set([
            ...(activity.restaurantIds || []),
            ...this.restaurants.execute(new ListRestaurantsUseCase.Request(r.session.roomId || 'local', true)).value.map(a => a.id)
        ]);
        for (const id of ids) {
            const consumption = this.consumption.execute(new GetConsumptionUseCase.Request(activity.id, id)).value;
            if (consumption?.rounds.some(round => round.status === 'SUBMITTED' || Object.values(round.items).some(quantity => quantity > 0)))
                return new AbandonEmptyDiningUseCase.Response(false);
        }
        // Leaving the menu must keep a shared room available for everyone to rejoin.
        if (!r.session.roomId)
            await this.abandon.execute(new AbandonDiningUseCase.Request(r.session, r.actorId));
        return new AbandonEmptyDiningUseCase.Response(true);
    }
}
