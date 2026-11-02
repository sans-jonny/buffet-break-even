import {PublishRestaurantOriginalUseCase} from '../../port/in/catalog/PublishRestaurantOriginalUseCase';
import {PublishLocalRestaurantUseCase} from '../../port/in/catalog/PublishLocalRestaurantUseCase';
import {SyncRoomRestaurantUseCase} from '../../port/in/catalog/SyncRoomRestaurantUseCase';
import {ListRoomsUseCase} from '../../../../contexts/collaboration/application/port/in/ListRoomsUseCase';

export class PublishRestaurantOriginalWorkflow implements PublishRestaurantOriginalUseCase {
    constructor(private readonly original: PublishLocalRestaurantUseCase,
                private readonly rooms: ListRoomsUseCase,
                private readonly synchronize: SyncRoomRestaurantUseCase) {
    }

    async execute(r: PublishRestaurantOriginalUseCase.Request): Promise<PublishRestaurantOriginalUseCase.Response> {
        const original = (await this.original.execute(new PublishLocalRestaurantUseCase.Request(r.restaurant))).value;
        for (const room of this.rooms.execute(new ListRoomsUseCase.Request()).value) {
            if (room.status !== 'ACTIVE' || !room.members.some(m => m.id === r.actorId && m.online && m.present))
                continue;
            if (original.type === 'PRIVATE' && (room.creatorId !== r.actorId || !room.privateSourceIds.includes(original.id)))
                continue;
            await this.synchronize.execute(new SyncRoomRestaurantUseCase.Request(room.id, r.actorId, original));
        }
        return new PublishRestaurantOriginalUseCase.Response();
    }
}
