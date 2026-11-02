import {DeleteRestaurantOriginalUseCase} from '../../port/in/catalog/DeleteRestaurantOriginalUseCase';
import {DeleteLocalRestaurantUseCase} from '../../port/in/catalog/DeleteLocalRestaurantUseCase';
import type {RoomCatalogSynchronization} from '../../service/RoomCatalogSynchronization';

export class DeleteRestaurantOriginalWorkflow implements DeleteRestaurantOriginalUseCase {
    constructor(private readonly original: DeleteLocalRestaurantUseCase, private readonly synchronization: RoomCatalogSynchronization) {}
    async execute(r: DeleteRestaurantOriginalUseCase.Request): Promise<DeleteRestaurantOriginalUseCase.Response> {
        const original = (await this.original.execute(new DeleteLocalRestaurantUseCase.Request(r.restaurantId))).value;
        return new DeleteRestaurantOriginalUseCase.Response(await this.synchronization.execute(original, r.actorId));
    }
}
