import type {InjectionToken} from '../../../kernel/application/InjectionToken';
import type {Dining} from '../dto/Dining';
import type {CatalogSynchronization} from '../dto/CatalogSynchronization';
import {ListRoomsUseCase} from '../../../contexts/collaboration/application/port/in/ListRoomsUseCase';
import {ListRestaurantsUseCase} from '../../../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import {SyncRoomRestaurantUseCase} from '../port/in/catalog/SyncRoomRestaurantUseCase';

/** Local originals and each room have separate commit points. Retry only missing room copies. */
export class RoomCatalogSynchronization {
    static readonly token = Symbol('RoomCatalogSynchronization') as InjectionToken<RoomCatalogSynchronization>;
    constructor(private readonly rooms: ListRoomsUseCase, private readonly restaurants: ListRestaurantsUseCase,
                private readonly synchronize: SyncRoomRestaurantUseCase) {}

    pending(actorId: string): CatalogSynchronization.Pending[] {
        const originals = this.restaurants.execute(new ListRestaurantsUseCase.Request('local', true)).value;
        return originals.map(original => ({restaurantId: original.id, name: original.name,
            roomIds: this.targets(original, actorId).map(room => room.id)})).filter(entry => entry.roomIds.length);
    }

    async execute(original: Dining.Restaurant, actorId: string): Promise<CatalogSynchronization.Result> {
        const pendingRooms: CatalogSynchronization.Failure[] = [];
        for (const room of this.targets(original, actorId)) {
            try {
                await this.synchronize.execute(new SyncRoomRestaurantUseCase.Request(room.id, actorId, original));
            } catch (error) {
                // Catch-up or a competing writer may already have published this version.
                // UNKNOWN must still be surfaced until the user's explicit acknowledgement.
                const code = typeof (error as Error)?.message === 'string' ? (error as Error).message : 'CATALOG_SYNC_FAILED';
                if (code !== 'UNKNOWN_COMMIT_OUTCOME' && this.current(room.id, original)) continue;
                pendingRooms.push({roomId: room.id, code});
            }
        }
        return {localCommitted: true, pendingRooms};
    }

    private targets(original: Dining.Restaurant, actorId: string): readonly Dining.Room[] {
        return this.rooms.execute(new ListRoomsUseCase.Request()).value.filter(room =>
            room.status === 'ACTIVE' && room.members.some(member => member.id === actorId && member.online && member.present)
            && (original.type === 'PUBLIC' || (room.creatorId === actorId && room.privateSourceIds.includes(original.id)))
            && !this.current(room.id, original));
    }

    private current(roomId: string, original: Dining.Restaurant): boolean {
        const id = original.type === 'PRIVATE' ? `${roomId}:${original.id}` : original.id;
        const copy = this.restaurants.execute(new ListRestaurantsUseCase.Request(roomId, true)).value.find(restaurant => restaurant.id === id);
        return !!copy && (copy.sourceVersion || copy.version) >= original.version;
    }
}
