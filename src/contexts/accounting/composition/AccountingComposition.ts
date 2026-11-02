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
    export function register(scope: UniAppUseCaseScope, repositoryContext: RepositoryTransaction, options: {id: () => string}): void {
        scope.factory(DiningActivityRepository.token, () => new StorageDiningActivityRepository(repositoryContext));
        scope.factory(RestaurantConsumptionRepository.token, () => new StorageRestaurantConsumptionRepository(repositoryContext));
        scope.factory(DiningActivityQuery.token, () => new StorageDiningActivityQuery(scope.resolve(DiningActivityRepository.token)));
        scope.factory(ConsumptionQuery.token, () => new StorageConsumptionQuery(scope.resolve(RestaurantConsumptionRepository.token)));
        scope.factory(CreateDiningActivityUseCase.token, () => new CreateDiningActivityInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token)));
        scope.factory(CreateConsumptionUseCase.token, () => new CreateConsumptionInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningActivityRepository.token),
            scope.resolve(RestaurantConsumptionRepository.token)
        ));
        scope.factory(IncreaseProductUseCase.token, () => new IncreaseProductInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningActivityRepository.token),
            scope.resolve(RestaurantConsumptionRepository.token)
        ));
        scope.factory(DecreaseProductUseCase.token, () => new DecreaseProductInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningActivityRepository.token),
            scope.resolve(RestaurantConsumptionRepository.token)
        ));
        scope.factory(RemoveConsumptionItemUseCase.token, () => new RemoveConsumptionItemInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningActivityRepository.token),
            scope.resolve(RestaurantConsumptionRepository.token)
        ));
        scope.factory(ClearRoundUseCase.token, () => new ClearRoundInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningActivityRepository.token),
            scope.resolve(RestaurantConsumptionRepository.token)
        ));
        scope.factory(SubmitRoundUseCase.token, () => new SubmitRoundInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningActivityRepository.token),
            scope.resolve(RestaurantConsumptionRepository.token),
            options.id
        ));
        scope.factory(ChangeTicketPriceUseCase.token, () => new ChangeTicketPriceInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token)));
        scope.factory(EndDiningActivityUseCase.token, () => new EndDiningActivityInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningActivityRepository.token),
            scope.resolve(RestaurantConsumptionRepository.token)
        ));
        scope.factory(AbandonDiningActivityUseCase.token, () => new AbandonDiningActivityInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityRepository.token)));
        scope.factory(ReconcileConsumptionUseCase.token, () => new ReconcileConsumptionInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningActivityRepository.token),
            scope.resolve(RestaurantConsumptionRepository.token)
        ));
        scope.factory(GetDiningActivityUseCase.token, () => new GetDiningActivityInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityQuery.token)));
        scope.factory(GetConsumptionUseCase.token, () => new GetConsumptionInteractor(scope.resolve(TransactionRunner.token), scope.resolve(ConsumptionQuery.token)));
        scope.factory(ListDiningActivitiesUseCase.token, () => new ListDiningActivitiesInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningActivityQuery.token)));
        scope.factory(CalculateDiningResultUseCase.token, () => new CalculateDiningResultInteractor(
            scope.resolve(TransactionRunner.token),
            scope.resolve(DiningActivityQuery.token),
            scope.resolve(ConsumptionQuery.token)
        ));
    }
}
