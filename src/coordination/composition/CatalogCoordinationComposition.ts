import {GetRoomUseCase} from '../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {RetryCatalogSyncUseCase} from '../application/port/in/catalog/RetryCatalogSyncUseCase';
import {GetPendingCatalogSyncUseCase} from '../application/port/in/catalog/GetPendingCatalogSyncUseCase';
import {RetryCatalogSyncInteractor} from '../application/use-case/catalog/RetryCatalogSyncInteractor';
import {GetPendingCatalogSyncInteractor} from '../application/use-case/catalog/GetPendingCatalogSyncInteractor';
import {RoomCatalogSynchronization} from '../application/service/RoomCatalogSynchronization';
import {RoomRestaurantPublisher} from '../application/port/out/catalog/RoomRestaurantPublisher';
import {UniAppUseCaseScope} from '../../composition/UniAppUseCaseScope';
import {TransactionRunner} from '../../kernel/application/TransactionRunner';
import {ReconcileConsumptionUseCase} from '../../contexts/accounting/application/port/in/ReconcileConsumptionUseCase';
import {ListDiningActivitiesUseCase} from '../../contexts/accounting/application/port/in/ListDiningActivitiesUseCase';
import {PublishRestaurantUseCase} from '../../contexts/catalog/application/port/in/PublishRestaurantUseCase';
import {DeleteRestaurantUseCase} from '../../contexts/catalog/application/port/in/DeleteRestaurantUseCase';
import {ReplaceRoomRestaurantUseCase} from '../../contexts/catalog/application/port/in/ReplaceRoomRestaurantUseCase';
import {GetRestaurantUseCase} from '../../contexts/catalog/application/port/in/GetRestaurantUseCase';
import {ListRestaurantsUseCase} from '../../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import {ListRoomsUseCase} from '../../contexts/collaboration/application/port/in/ListRoomsUseCase';
import {AuthorizeRoomUseCase} from '../../contexts/collaboration/application/port/in/AuthorizeRoomUseCase';
import {AuthorizeCatalogSyncUseCase} from '../../contexts/collaboration/application/port/in/AuthorizeCatalogSyncUseCase';
import {PublishLocalRestaurantInteractor} from '../application/use-case/catalog/PublishLocalRestaurantInteractor';
import {PublishLocalRestaurantUseCase} from '../application/port/in/catalog/PublishLocalRestaurantUseCase';
import {DeleteLocalRestaurantInteractor} from '../application/use-case/catalog/DeleteLocalRestaurantInteractor';
import {DeleteLocalRestaurantUseCase} from '../application/port/in/catalog/DeleteLocalRestaurantUseCase';
import {SyncRoomRestaurantInteractor} from '../application/use-case/catalog/SyncRoomRestaurantInteractor';
import {SyncRoomRestaurantUseCase} from '../application/port/in/catalog/SyncRoomRestaurantUseCase';
import {
    PublishRestaurantOriginalWorkflow
} from '../application/workflow/catalog/PublishRestaurantOriginalWorkflow';
import {PublishRestaurantOriginalUseCase} from '../application/port/in/catalog/PublishRestaurantOriginalUseCase';
import {DeleteRestaurantOriginalWorkflow} from '../application/workflow/catalog/DeleteRestaurantOriginalWorkflow';
import {DeleteRestaurantOriginalUseCase} from '../application/port/in/catalog/DeleteRestaurantOriginalUseCase';

export namespace CatalogCoordinationComposition {
    export function register(scope: UniAppUseCaseScope): void {
        scope.factory(RoomCatalogSynchronization.token, () => new RoomCatalogSynchronization(
            scope.resolve(ListRoomsUseCase.token),
            scope.resolve(ListRestaurantsUseCase.token),
            scope.resolve(SyncRoomRestaurantUseCase.token)
        ));
        scope.factory(GetPendingCatalogSyncUseCase.token, () => new GetPendingCatalogSyncInteractor(scope.resolve(RoomCatalogSynchronization.token)));
        scope.factory(RetryCatalogSyncUseCase.token, () => new RetryCatalogSyncInteractor(scope.resolve(GetRestaurantUseCase.token), scope.resolve(RoomCatalogSynchronization.token)));
        scope.factory(PublishLocalRestaurantUseCase.token, () => new PublishLocalRestaurantInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(ListDiningActivitiesUseCase.token),
            scope.resolve(ReconcileConsumptionUseCase.token),
            scope.resolve(PublishRestaurantUseCase.token)
        ));
        scope.factory(DeleteLocalRestaurantUseCase.token, () => new DeleteLocalRestaurantInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(ListDiningActivitiesUseCase.token),
            scope.resolve(ReconcileConsumptionUseCase.token),
            scope.resolve(GetRestaurantUseCase.token),
            scope.resolve(DeleteRestaurantUseCase.token)
        ));
        scope.factory(SyncRoomRestaurantUseCase.token, () => new SyncRoomRestaurantInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(ReconcileConsumptionUseCase.token),
            scope.resolve(ReplaceRoomRestaurantUseCase.token),
            scope.resolve(GetRestaurantUseCase.token),
            scope.resolve(PublishRestaurantUseCase.token),
            scope.resolve(AuthorizeRoomUseCase.token),
            scope.resolve(AuthorizeCatalogSyncUseCase.token),
            scope.resolve(GetRoomUseCase.token),
            scope.resolve(RoomRestaurantPublisher.token)
        ));
        scope.factory(PublishRestaurantOriginalUseCase.token, () => new PublishRestaurantOriginalWorkflow(
            scope.resolve(PublishLocalRestaurantUseCase.token),
            scope.resolve(RoomCatalogSynchronization.token)
        ));
        scope.factory(DeleteRestaurantOriginalUseCase.token, () => new DeleteRestaurantOriginalWorkflow(
            scope.resolve(DeleteLocalRestaurantUseCase.token),
            scope.resolve(RoomCatalogSynchronization.token)
        ));
    }
}
