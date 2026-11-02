import type {InjectionToken} from '../../../kernel/application/InjectionToken';
import {RepositoryTransaction} from '../../../infrastructure/storage/RepositoryTransaction';
import {BatchRuntime} from '../../../infrastructure/projection/BatchRuntime';
import {AccountingEventMapper} from '../adapter/persistence/AccountingEventMapper';
import {UniAppUseCaseScope} from '../../../composition/UniAppUseCaseScope';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {DiningActivityRepository} from '../application/port/out/DiningActivityRepository';
import {
    StorageDiningActivityRepository
} from '../adapter/persistence/StorageDiningActivityRepository';
import {
    RestaurantConsumptionRepository
} from '../application/port/out/RestaurantConsumptionRepository';
import {
    StorageRestaurantConsumptionRepository
} from '../adapter/persistence/StorageRestaurantConsumptionRepository';
import {DiningActivityQuery} from '../application/port/out/DiningActivityQuery';
import {StorageDiningActivityQuery} from '../adapter/persistence/StorageDiningActivityQuery';
import {ConsumptionQuery} from '../application/port/out/ConsumptionQuery';
import {StorageConsumptionQuery} from '../adapter/persistence/StorageConsumptionQuery';
import {
    CreateDiningActivityInteractor
} from '../application/use-case/CreateDiningActivityInteractor';
import {CreateDiningActivityUseCase} from '../application/port/in/CreateDiningActivityUseCase';
import {CreateConsumptionInteractor} from '../application/use-case/CreateConsumptionInteractor';
import {CreateConsumptionUseCase} from '../application/port/in/CreateConsumptionUseCase';
import {IncreaseProductInteractor} from '../application/use-case/IncreaseProductInteractor';
import {IncreaseProductUseCase} from '../application/port/in/IncreaseProductUseCase';
import {DecreaseProductInteractor} from '../application/use-case/DecreaseProductInteractor';
import {DecreaseProductUseCase} from '../application/port/in/DecreaseProductUseCase';
import {
    RemoveConsumptionItemInteractor
} from '../application/use-case/RemoveConsumptionItemInteractor';
import {RemoveConsumptionItemUseCase} from '../application/port/in/RemoveConsumptionItemUseCase';
import {ClearRoundInteractor} from '../application/use-case/ClearRoundInteractor';
import {ClearRoundUseCase} from '../application/port/in/ClearRoundUseCase';
import {SubmitRoundInteractor} from '../application/use-case/SubmitRoundInteractor';
import {SubmitRoundUseCase} from '../application/port/in/SubmitRoundUseCase';
import {ChangeTicketPriceInteractor} from '../application/use-case/ChangeTicketPriceInteractor';
import {ChangeTicketPriceUseCase} from '../application/port/in/ChangeTicketPriceUseCase';
import {EndDiningActivityInteractor} from '../application/use-case/EndDiningActivityInteractor';
import {EndDiningActivityUseCase} from '../application/port/in/EndDiningActivityUseCase';
import {
    AbandonDiningActivityInteractor
} from '../application/use-case/AbandonDiningActivityInteractor';
import {AbandonDiningActivityUseCase} from '../application/port/in/AbandonDiningActivityUseCase';
import {
    ReconcileConsumptionInteractor
} from '../application/use-case/ReconcileConsumptionInteractor';
import {ReconcileConsumptionUseCase} from '../application/port/in/ReconcileConsumptionUseCase';
import {GetDiningActivityInteractor} from '../application/use-case/GetDiningActivityInteractor';
import {GetDiningActivityUseCase} from '../application/port/in/GetDiningActivityUseCase';
import {GetConsumptionInteractor} from '../application/use-case/GetConsumptionInteractor';
import {GetConsumptionUseCase} from '../application/port/in/GetConsumptionUseCase';
import {
    ListDiningActivitiesInteractor
} from '../application/use-case/ListDiningActivitiesInteractor';
import {ListDiningActivitiesUseCase} from '../application/port/in/ListDiningActivitiesUseCase';
import {
    CalculateDiningResultInteractor
} from '../application/use-case/CalculateDiningResultInteractor';
import {CalculateDiningResultUseCase} from '../application/port/in/CalculateDiningResultUseCase';

export namespace AccountingComposition {
    export function registerRuntime(runtime: BatchRuntime.Runtime): void {
        runtime.register(AccountingEventMapper.activityTypes, StorageDiningActivityRepository.project);
        runtime.register(AccountingEventMapper.consumptionTypes, StorageRestaurantConsumptionRepository.project);
    }
    export function register(scope: UniAppUseCaseScope, repositoryContext: RepositoryTransaction, options: {id: () => string; now: () => string}, personalRunner: InjectionToken<TransactionRunner>): void {
        const diningActivityRepository = new StorageDiningActivityRepository(repositoryContext);
        scope.provide(DiningActivityRepository.token, diningActivityRepository);
        const restaurantConsumptionRepository = new StorageRestaurantConsumptionRepository(repositoryContext);
        scope.provide(RestaurantConsumptionRepository.token, restaurantConsumptionRepository);
        scope.provide(DiningActivityQuery.token, new StorageDiningActivityQuery(diningActivityRepository));
        scope.provide(ConsumptionQuery.token, new StorageConsumptionQuery(restaurantConsumptionRepository));
        scope.provide(CreateDiningActivityUseCase.token, new CreateDiningActivityInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token)));
        scope.provide(CreateConsumptionUseCase.token, new CreateConsumptionInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token), scope.resolve(RestaurantConsumptionRepository.token)));
        scope.provide(IncreaseProductUseCase.token, new IncreaseProductInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token), scope.resolve(RestaurantConsumptionRepository.token)));
        scope.provide(DecreaseProductUseCase.token, new DecreaseProductInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token), scope.resolve(RestaurantConsumptionRepository.token)));
        scope.provide(RemoveConsumptionItemUseCase.token, new RemoveConsumptionItemInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token), scope.resolve(RestaurantConsumptionRepository.token)));
        scope.provide(ClearRoundUseCase.token, new ClearRoundInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token), scope.resolve(RestaurantConsumptionRepository.token)));
        scope.provide(SubmitRoundUseCase.token, new SubmitRoundInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token), scope.resolve(RestaurantConsumptionRepository.token), options.id));
        scope.provide(ChangeTicketPriceUseCase.token, new ChangeTicketPriceInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token)));
        scope.provide(EndDiningActivityUseCase.token, new EndDiningActivityInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token), scope.resolve(RestaurantConsumptionRepository.token)));
        scope.provide(AbandonDiningActivityUseCase.token, new AbandonDiningActivityInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token)));
        scope.provide(ReconcileConsumptionUseCase.token, new ReconcileConsumptionInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token), scope.resolve(RestaurantConsumptionRepository.token)));
        scope.provide(GetDiningActivityUseCase.token, new GetDiningActivityInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityQuery.token)));
        scope.provide(GetConsumptionUseCase.token, new GetConsumptionInteractor(scope.resolve(TransactionRunner.token), scope.resolve(ConsumptionQuery.token)));
        scope.provide(ListDiningActivitiesUseCase.token, new ListDiningActivitiesInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityQuery.token)));
        scope.provide(CalculateDiningResultUseCase.token, new CalculateDiningResultInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityQuery.token), scope.resolve(ConsumptionQuery.token)));
    }
}
