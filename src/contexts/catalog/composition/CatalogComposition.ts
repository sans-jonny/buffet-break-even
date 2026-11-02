import type {InjectionToken} from '../../../kernel/application/InjectionToken';
import {RepositoryTransaction} from '../../../infrastructure/storage/RepositoryTransaction';
import {BatchRuntime} from '../../../infrastructure/projection/BatchRuntime';
import {CatalogEventMapper} from '../adapter/persistence/CatalogEventMapper';
import {UniAppUseCaseScope} from '../../../composition/UniAppUseCaseScope';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {RestaurantRepository} from '../application/port/out/RestaurantRepository';
import {StorageRestaurantRepository} from '../adapter/persistence/StorageRestaurantRepository';
import {RestaurantQuery} from '../application/port/out/RestaurantQuery';
import {StorageRestaurantQuery} from '../adapter/persistence/StorageRestaurantQuery';
import {PublishRestaurantInteractor} from '../application/use-case/PublishRestaurantInteractor';
import {PublishRestaurantUseCase} from '../application/port/in/PublishRestaurantUseCase';
import {DeleteRestaurantInteractor} from '../application/use-case/DeleteRestaurantInteractor';
import {DeleteRestaurantUseCase} from '../application/port/in/DeleteRestaurantUseCase';
import {CopyRestaurantToRoomInteractor} from '../application/use-case/CopyRestaurantToRoomInteractor';
import {CopyRestaurantToRoomUseCase} from '../application/port/in/CopyRestaurantToRoomUseCase';
import {
    ReplaceRoomRestaurantInteractor
} from '../application/use-case/ReplaceRoomRestaurantInteractor';
import {ReplaceRoomRestaurantUseCase} from '../application/port/in/ReplaceRoomRestaurantUseCase';
import {GetRestaurantInteractor} from '../application/use-case/GetRestaurantInteractor';
import {GetRestaurantUseCase} from '../application/port/in/GetRestaurantUseCase';
import {ListRestaurantsInteractor} from '../application/use-case/ListRestaurantsInteractor';
import {ListRestaurantsUseCase} from '../application/port/in/ListRestaurantsUseCase';

export namespace CatalogComposition {
    export function registerRuntime(runtime: BatchRuntime.Runtime): void {
        runtime.register(CatalogEventMapper.types, StorageRestaurantRepository.project);
    }
    export function register(scope: UniAppUseCaseScope, repositoryContext: RepositoryTransaction, options: {id: () => string; now: () => string}, personalRunner: InjectionToken<TransactionRunner>): void {
        const restaurantRepository = new StorageRestaurantRepository(repositoryContext);
        scope.provide(RestaurantRepository.token, restaurantRepository);
        scope.provide(RestaurantQuery.token, new StorageRestaurantQuery(restaurantRepository));
        scope.provide(PublishRestaurantUseCase.token, new PublishRestaurantInteractor(scope.resolve(TransactionRunner.token), scope.resolve(RestaurantRepository.token)));
        scope.provide(DeleteRestaurantUseCase.token, new DeleteRestaurantInteractor(scope.resolve(TransactionRunner.token), scope.resolve(RestaurantRepository.token)));
        scope.provide(CopyRestaurantToRoomUseCase.token, new CopyRestaurantToRoomInteractor(scope.resolve(TransactionRunner.token), scope.resolve(RestaurantRepository.token)));
        scope.provide(ReplaceRoomRestaurantUseCase.token, new ReplaceRoomRestaurantInteractor(scope.resolve(TransactionRunner.token), scope.resolve(RestaurantRepository.token)));
        scope.provide(GetRestaurantUseCase.token, new GetRestaurantInteractor(scope.resolve(TransactionRunner.token), scope.resolve(RestaurantQuery.token)));
        scope.provide(ListRestaurantsUseCase.token, new ListRestaurantsInteractor(scope.resolve(TransactionRunner.token), scope.resolve(RestaurantQuery.token)));
    }
}
