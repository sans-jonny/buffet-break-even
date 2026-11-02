import {CreateDiningRoomUseCase} from '../../port/in/session/CreateDiningRoomUseCase';
import {CreateMultiplayerDiningUseCase} from '../../port/in/dining/CreateMultiplayerDiningUseCase';
import {GetPersonalDiningUseCase} from '../../port/in/device/GetPersonalDiningUseCase';
import {SelectDiningSessionUseCase} from '../../port/in/device/SelectDiningSessionUseCase';
import {ListRestaurantsUseCase} from '../../../../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import type {DiningPreferences} from '../../port/out/session/DiningPreferences';
import type {RoomGateway} from '../../port/out/session/RoomGateway';
import type {RoomConnection} from '../../port/out/session/RoomConnection';
import {InvalidRequestError} from '../../../../kernel/application/InvalidRequestError';

/** Remote allocation, catch-up, business commit and local selection are separate steps. */
export class CreateDiningRoomInteractor implements CreateDiningRoomUseCase {
    constructor(private readonly create: CreateMultiplayerDiningUseCase, private readonly select: SelectDiningSessionUseCase,
                private readonly personal: GetPersonalDiningUseCase, private readonly restaurants: ListRestaurantsUseCase,
                private readonly preferences: DiningPreferences, private readonly rooms: RoomGateway,
                private readonly connection: RoomConnection, private readonly id: () => string) {}
    async execute(request: CreateDiningRoomUseCase.Request): Promise<CreateDiningRoomUseCase.Response> {
        const actor = this.personal.execute().identity;
        if (!actor) throw new InvalidRequestError('IDENTITY_REQUIRED');
        if (!this.restaurants.execute(new ListRestaurantsUseCase.Request('local')).value
            .some(restaurant => restaurant.restaurantCategory.id === request.categoryId))
            throw new InvalidRequestError('RESTAURANT_CATEGORY_EMPTY');
        const room = await this.rooms.create();
        // Preserve the allocated room even when a later step fails, so its outcome can be checked.
        await this.preferences.rememberRoom(room.roomId);
        try {
            await this.connection.watch(room.roomId);
            const response = await this.create.execute(new CreateMultiplayerDiningUseCase.Request(
                room.roomId, room.code, this.id(), actor, request.ticketPriceMinor, request.categoryId));
            await this.select.execute(new SelectDiningSessionUseCase.Request(response.value));
            return new CreateDiningRoomUseCase.Response(response.value);
        } catch (error) {
            const code = (error as Error)?.message;
            if (code !== 'UNKNOWN_COMMIT_OUTCOME' && code !== 'SYNC_PENDING') this.connection.stop();
            throw error;
        }
    }
}
