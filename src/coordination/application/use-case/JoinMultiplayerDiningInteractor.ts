import {Transaction} from '../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../kernel/application/TransactionalInteractor';
import {JoinMultiplayerDiningUseCase} from '../port/in/JoinMultiplayerDiningUseCase';
import {
    ReconcileConsumptionUseCase
} from '../../../contexts/accounting/application/port/in/ReconcileConsumptionUseCase';
import {
    ListDiningActivitiesUseCase
} from '../../../contexts/accounting/application/port/in/ListDiningActivitiesUseCase';
import {ReplaceRoomRestaurantUseCase} from '../../../contexts/catalog/application/port/in/ReplaceRoomRestaurantUseCase';
import {GetRestaurantUseCase} from '../../../contexts/catalog/application/port/in/GetRestaurantUseCase';
import {JoinRoomUseCase} from '../../../contexts/collaboration/application/port/in/JoinRoomUseCase';
import {ListRoomsUseCase} from '../../../contexts/collaboration/application/port/in/ListRoomsUseCase';

export class JoinMultiplayerDiningInteractor extends TransactionalInteractor<JoinMultiplayerDiningUseCase.Request, JoinMultiplayerDiningUseCase.Response> implements JoinMultiplayerDiningUseCase {
    constructor(transactions: TransactionRunner,
                private readonly listDiningActivities: ListDiningActivitiesUseCase,
                private readonly reconcileConsumption: ReconcileConsumptionUseCase,
                private readonly getRestaurant: GetRestaurantUseCase,
                private readonly replaceRoomRestaurant: ReplaceRoomRestaurantUseCase,
                private readonly joinRoom: JoinRoomUseCase,
                private readonly listRooms: ListRoomsUseCase,
                private readonly now: () => string) {
        super(transactions, JoinMultiplayerDiningUseCase.token);
    }

    protected async executeInTransaction(r: JoinMultiplayerDiningUseCase.Request,
                                         tx: Transaction.Context): Promise<JoinMultiplayerDiningUseCase.Response> {
        const room = (await this.joinRoom.execute(new JoinRoomUseCase.Request(r.scope, r.roomId, r.member.id, r.member.nickname, this.now()))).value;
        if (room.status === 'ACTIVE' && room.creatorId === r.member.id) {
            for (const sourceId of room.privateSourceIds) {
                const original = this.getRestaurant.execute(new GetRestaurantUseCase.Request('local', sourceId)).value;
                const copy = this.getRestaurant.execute(new GetRestaurantUseCase.Request(r.roomId, r.roomId + ':' + sourceId)).value;
                if (original && copy && original.version > (copy.sourceVersion || 0)) {
                    const updated = (await this.replaceRoomRestaurant.execute(new ReplaceRoomRestaurantUseCase.Request(r.scope, r.roomId, original))).value;
                    for (const activity of this.listDiningActivities.execute(new ListDiningActivitiesUseCase.Request()).value) {
                        const room = this.listRooms.execute(new ListRoomsUseCase.Request()).value.find(a => a.activityId === activity.id);
                        if ((r.roomId === 'local' && !room) || room?.id === r.roomId)
                            await this.reconcileConsumption.execute(new ReconcileConsumptionUseCase.Request(r.scope, activity.id, updated));
                    }
                }
            }
        }
        return new JoinMultiplayerDiningUseCase.Response({...r.scope, activityId: room.activityId});
    }
}
