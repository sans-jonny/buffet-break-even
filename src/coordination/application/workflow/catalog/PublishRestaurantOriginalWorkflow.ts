import {PublishRestaurantOriginalUseCase} from '../../port/in/catalog/PublishRestaurantOriginalUseCase';
import {PublishLocalRestaurantUseCase} from '../../port/in/catalog/PublishLocalRestaurantUseCase';
import type {RoomCatalogSynchronization} from '../../service/RoomCatalogSynchronization';

export class PublishRestaurantOriginalWorkflow implements PublishRestaurantOriginalUseCase {
    constructor(private readonly original: PublishLocalRestaurantUseCase, private readonly synchronization: RoomCatalogSynchronization) {}
    async execute(r: PublishRestaurantOriginalUseCase.Request): Promise<PublishRestaurantOriginalUseCase.Response> {
        const original = (await this.original.execute(new PublishLocalRestaurantUseCase.Request(r.restaurant))).value;
        return new PublishRestaurantOriginalUseCase.Response(await this.synchronization.execute(original, r.actorId));
    }
}
