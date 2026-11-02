import {Domain} from '../../../../kernel/domain/Domain';
import {GetRestaurantUseCase} from '../../../../contexts/catalog/application/port/in/GetRestaurantUseCase';
import {RetryCatalogSyncUseCase} from '../../port/in/catalog/RetryCatalogSyncUseCase';
import type {RoomCatalogSynchronization} from '../../service/RoomCatalogSynchronization';

export class RetryCatalogSyncInteractor implements RetryCatalogSyncUseCase {
    constructor(private readonly restaurants: GetRestaurantUseCase, private readonly synchronization: RoomCatalogSynchronization) {}
    async execute(request: RetryCatalogSyncUseCase.Request): Promise<RetryCatalogSyncUseCase.Response> {
        const original = this.restaurants.execute(new GetRestaurantUseCase.Request('local', request.restaurantId)).value;
        Domain.require(original, 'RESTAURANT_NOT_FOUND');
        return new RetryCatalogSyncUseCase.Response(await this.synchronization.execute(original, request.actorId));
    }
}
