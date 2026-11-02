import {GetPendingCatalogSyncUseCase} from '../../port/in/catalog/GetPendingCatalogSyncUseCase';
import type {RoomCatalogSynchronization} from '../../service/RoomCatalogSynchronization';

export class GetPendingCatalogSyncInteractor implements GetPendingCatalogSyncUseCase {
    constructor(private readonly synchronization: RoomCatalogSynchronization) {}
    execute(request: GetPendingCatalogSyncUseCase.Request): GetPendingCatalogSyncUseCase.Response {
        return new GetPendingCatalogSyncUseCase.Response(this.synchronization.pending(request.actorId));
    }
}
