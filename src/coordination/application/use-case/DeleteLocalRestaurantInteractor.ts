import {Domain} from '../../../kernel/domain/Domain';
import {Transaction} from '../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../kernel/application/TransactionalInteractor';
import {DeleteLocalRestaurantUseCase} from '../port/in/DeleteLocalRestaurantUseCase';
import {
    ReconcileConsumptionUseCase
} from '../../../contexts/accounting/application/port/in/ReconcileConsumptionUseCase';
import {
    ListDiningActivitiesUseCase
} from '../../../contexts/accounting/application/port/in/ListDiningActivitiesUseCase';
import {DeleteRestaurantUseCase} from '../../../contexts/catalog/application/port/in/DeleteRestaurantUseCase';
import {GetRestaurantUseCase} from '../../../contexts/catalog/application/port/in/GetRestaurantUseCase';
import {ListRoomsUseCase} from '../../../contexts/collaboration/application/port/in/ListRoomsUseCase';

export class DeleteLocalRestaurantInteractor extends TransactionalInteractor<DeleteLocalRestaurantUseCase.Request, DeleteLocalRestaurantUseCase.Response> implements DeleteLocalRestaurantUseCase {
    constructor(transactions: TransactionRunner,
                private readonly listDiningActivities: ListDiningActivitiesUseCase,
                private readonly reconcileConsumption: ReconcileConsumptionUseCase,
                private readonly getRestaurant: GetRestaurantUseCase,
                private readonly deleteRestaurant: DeleteRestaurantUseCase,
                private readonly listRooms: ListRoomsUseCase) {
        super(transactions, DeleteLocalRestaurantUseCase.token);
    }

    protected async executeInTransaction(r: DeleteLocalRestaurantUseCase.Request,
                                         tx: Transaction.Context): Promise<DeleteLocalRestaurantUseCase.Response> {
        const original = this.getRestaurant.execute(new GetRestaurantUseCase.Request('local', r.restaurantId)).value;
        Domain.require(original?.type === 'PRIVATE', 'PRIVATE_ORIGINAL_REQUIRED');
        const updated = (await this.deleteRestaurant.execute(new DeleteRestaurantUseCase.Request(r.scope, 'local', r.restaurantId))).value;
        for (const activity of this.listDiningActivities.execute(new ListDiningActivitiesUseCase.Request()).value) {
            const room = this.listRooms.execute(new ListRoomsUseCase.Request()).value.find(a => a.activityId === activity.id);
            if (('local' === 'local' && !room) || room?.id === 'local')
                await this.reconcileConsumption.execute(new ReconcileConsumptionUseCase.Request(r.scope, activity.id, updated));
        }
        return new DeleteLocalRestaurantUseCase.Response(updated);
    }
}
