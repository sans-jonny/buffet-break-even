import {DeleteRestaurantOriginalUseCase} from '../../port/in/catalog/DeleteRestaurantOriginalUseCase';
import {DeleteLocalRestaurantUseCase} from '../../port/in/catalog/DeleteLocalRestaurantUseCase';
import {SyncRoomRestaurantUseCase} from '../../port/in/catalog/SyncRoomRestaurantUseCase';
import {ListRoomsUseCase} from '../../../../contexts/collaboration/application/port/in/ListRoomsUseCase';

export class DeleteRestaurantOriginalWorkflow implements DeleteRestaurantOriginalUseCase {
    constructor(private readonly original: DeleteLocalRestaurantUseCase,
                private readonly rooms: ListRoomsUseCase,
                private readonly synchronize: SyncRoomRestaurantUseCase) {
    }

    async execute(r: DeleteRestaurantOriginalUseCase.Request): Promise<DeleteRestaurantOriginalUseCase.Response> {
        const original = (await this.original.execute(new DeleteLocalRestaurantUseCase.Request(r.restaurantId))).value;
        for (const room of this.rooms.execute(new ListRoomsUseCase.Request()).value) {
            if (room.status !== 'ACTIVE' || !room.members.some(m => m.id === r.actorId && m.online && m.present))
                continue;
            if (original.type === 'PRIVATE' && (room.creatorId !== r.actorId || !room.privateSourceIds.includes(original.id)))
                continue;
            await this.synchronize.execute(new SyncRoomRestaurantUseCase.Request(room.id, r.actorId, original));
        }
        return new DeleteRestaurantOriginalUseCase.Response();
    }
}
