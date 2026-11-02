import {Transaction} from '../../../../kernel/application/Transaction';
import {TransactionRunner} from '../../../../kernel/application/TransactionRunner';
import {TransactionalInteractor} from '../../../../kernel/application/TransactionalInteractor';
import {JoinMultiplayerDiningUseCase} from '../../port/in/room/JoinMultiplayerDiningUseCase';
import {
    ReconcileConsumptionUseCase
} from '../../../../contexts/accounting/application/port/in/ReconcileConsumptionUseCase';
import {
    ListDiningActivitiesUseCase
} from '../../../../contexts/accounting/application/port/in/ListDiningActivitiesUseCase';
import {ReplaceRoomRestaurantUseCase} from '../../../../contexts/catalog/application/port/in/ReplaceRoomRestaurantUseCase';
import {GetRestaurantUseCase} from '../../../../contexts/catalog/application/port/in/GetRestaurantUseCase';
import {JoinRoomUseCase} from '../../../../contexts/collaboration/application/port/in/JoinRoomUseCase';
import {ListRoomsUseCase} from '../../../../contexts/collaboration/application/port/in/ListRoomsUseCase';
import {RoomRestaurantPublisher} from '../../port/out/catalog/RoomRestaurantPublisher';

export class JoinMultiplayerDiningInteractor extends TransactionalInteractor<JoinMultiplayerDiningUseCase.Request, JoinMultiplayerDiningUseCase.Response> implements JoinMultiplayerDiningUseCase {
    constructor(transactions: TransactionRunner,
                private readonly listDiningActivities: ListDiningActivitiesUseCase,
                private readonly reconcileConsumption: ReconcileConsumptionUseCase,
                private readonly getRestaurant: GetRestaurantUseCase,
                private readonly replaceRoomRestaurant: ReplaceRoomRestaurantUseCase,
                private readonly joinRoom: JoinRoomUseCase,
                private readonly listRooms: ListRoomsUseCase,
                private readonly roomRestaurants: RoomRestaurantPublisher,
                private readonly now: () => string) {
        super(transactions, JoinMultiplayerDiningUseCase.token);
    }

    protected async executeInTransaction(r: JoinMultiplayerDiningUseCase.Request,
                                         tx: Transaction.Context): Promise<JoinMultiplayerDiningUseCase.Response> {
        const previous = this.listRooms.execute(new ListRoomsUseCase.Request()).value.find(room => room.id === r.roomId);
        const online = previous?.members.some(member => member.id === r.member.id && member.present && member.online);
        const room = previous && ((previous.status === 'ACTIVE' && online) ||
            (previous.status === 'ENDED' && previous.eligibleIds.includes(r.member.id))) ? previous
            : (await this.joinRoom.execute(new JoinRoomUseCase.Request(r.scope, r.roomId, r.member.id, r.member.nickname, this.now()))).value;
        if (room.status === 'ACTIVE' && room.creatorId === r.member.id) {
            for (const sourceId of room.privateSourceIds) {
                const original = this.getRestaurant.execute(new GetRestaurantUseCase.Request('local', sourceId)).value;
                const copy = this.getRestaurant.execute(new GetRestaurantUseCase.Request(r.roomId, r.roomId + ':' + sourceId)).value;
                if (original?.type !== 'PRIVATE' || copy?.type !== 'ROOM_COPY' || copy.sourceId !== sourceId) continue;
                await this.roomRestaurants.publishMedia?.(r.roomId, [sourceId]);
                if (original.version > (copy.sourceVersion || 0)) {
                    const updated = (await this.replaceRoomRestaurant.execute(new ReplaceRoomRestaurantUseCase.Request(r.scope, r.roomId, original))).value;
                    for (const activity of this.listDiningActivities.execute(new ListDiningActivitiesUseCase.Request()).value) {
                        const room = this.listRooms.execute(new ListRoomsUseCase.Request()).value.find(a => a.activityId === activity.id);
                        if (room?.id === r.roomId && activity.status === 'ACTIVE')
                            await this.reconcileConsumption.execute(new ReconcileConsumptionUseCase.Request(r.scope, activity.id, updated));
                    }
                }
            }
        }
        return new JoinMultiplayerDiningUseCase.Response({...r.scope, activityId: room.activityId});
    }
}
