import {RoomRestaurantPublisher} from '../coordination/application/port/out/RoomRestaurantPublisher';
import {RoomRestaurantPersistence} from '../infrastructure/storage/RoomRestaurantPersistence';
import {RepositoryTransaction} from '../infrastructure/storage/RepositoryTransaction';
import {type App, createSSRApp} from 'vue';
import {ManifestStorage} from '../infrastructure/storage/ManifestStorage';
import {BatchRuntime} from '../infrastructure/projection/BatchRuntime';
import {UniRoomRelay} from '../infrastructure/event-store/UniRoomRelay';
import {PersonalResults} from '../infrastructure/projection/PersonalResults';
import {LocalDataTransactionRunner} from '../infrastructure/storage/LocalDataTransactionRunner';
import {StorageLocalDiningData} from '../infrastructure/storage/StorageLocalDiningData';
import {DiningApplication} from './DiningApplication';
import {UniAppUseCaseScope} from './UniAppUseCaseScope';
import {ActiveTransactionRunner} from '../infrastructure/dependency-injection/ActiveTransactionRunner';
import {UseCaseTransactionRunner} from '../infrastructure/dependency-injection/UseCaseTransactionRunner';
import {TransactionRunner} from '../kernel/application/TransactionRunner';
import {Transaction} from '../kernel/application/Transaction';
import {UseCase} from '../kernel/application/UseCase';
import {AccountingEventMapper} from '../contexts/accounting/adapter/persistence/AccountingEventMapper';
import {CatalogEventMapper} from '../contexts/catalog/adapter/persistence/CatalogEventMapper';
import {CollaborationEventMapper} from '../contexts/collaboration/adapter/persistence/CollaborationEventMapper';
import {DiningActivityRepository} from '../contexts/accounting/application/port/out/DiningActivityRepository';
import {
    StorageDiningActivityRepository
} from '../contexts/accounting/adapter/persistence/StorageDiningActivityRepository';
import {
    RestaurantConsumptionRepository
} from '../contexts/accounting/application/port/out/RestaurantConsumptionRepository';
import {
    StorageRestaurantConsumptionRepository
} from '../contexts/accounting/adapter/persistence/StorageRestaurantConsumptionRepository';
import {RestaurantRepository} from '../contexts/catalog/application/port/out/RestaurantRepository';
import {StorageRestaurantRepository} from '../contexts/catalog/adapter/persistence/StorageRestaurantRepository';
import {DiningRoomRepository} from '../contexts/collaboration/application/port/out/DiningRoomRepository';
import {StorageDiningRoomRepository} from '../contexts/collaboration/adapter/persistence/StorageDiningRoomRepository';
import {DiningActivityQuery} from '../contexts/accounting/application/port/out/DiningActivityQuery';
import {StorageDiningActivityQuery} from '../contexts/accounting/adapter/persistence/StorageDiningActivityQuery';
import {ConsumptionQuery} from '../contexts/accounting/application/port/out/ConsumptionQuery';
import {StorageConsumptionQuery} from '../contexts/accounting/adapter/persistence/StorageConsumptionQuery';
import {RestaurantQuery} from '../contexts/catalog/application/port/out/RestaurantQuery';
import {StorageRestaurantQuery} from '../contexts/catalog/adapter/persistence/StorageRestaurantQuery';
import {RoomQuery} from '../contexts/collaboration/application/port/out/RoomQuery';
import {StorageRoomQuery} from '../contexts/collaboration/adapter/persistence/StorageRoomQuery';
import {LocalDiningData} from '../coordination/application/port/out/LocalDiningData';
import {
    CreateDiningActivityInteractor
} from '../contexts/accounting/application/use-case/CreateDiningActivityInteractor';
import {CreateDiningActivityUseCase} from '../contexts/accounting/application/port/in/CreateDiningActivityUseCase';
import {CreateConsumptionInteractor} from '../contexts/accounting/application/use-case/CreateConsumptionInteractor';
import {CreateConsumptionUseCase} from '../contexts/accounting/application/port/in/CreateConsumptionUseCase';
import {IncreaseProductInteractor} from '../contexts/accounting/application/use-case/IncreaseProductInteractor';
import {IncreaseProductUseCase} from '../contexts/accounting/application/port/in/IncreaseProductUseCase';
import {DecreaseProductInteractor} from '../contexts/accounting/application/use-case/DecreaseProductInteractor';
import {DecreaseProductUseCase} from '../contexts/accounting/application/port/in/DecreaseProductUseCase';
import {
    RemoveConsumptionItemInteractor
} from '../contexts/accounting/application/use-case/RemoveConsumptionItemInteractor';
import {RemoveConsumptionItemUseCase} from '../contexts/accounting/application/port/in/RemoveConsumptionItemUseCase';
import {ClearRoundInteractor} from '../contexts/accounting/application/use-case/ClearRoundInteractor';
import {ClearRoundUseCase} from '../contexts/accounting/application/port/in/ClearRoundUseCase';
import {SubmitRoundInteractor} from '../contexts/accounting/application/use-case/SubmitRoundInteractor';
import {SubmitRoundUseCase} from '../contexts/accounting/application/port/in/SubmitRoundUseCase';
import {ChangeTicketPriceInteractor} from '../contexts/accounting/application/use-case/ChangeTicketPriceInteractor';
import {ChangeTicketPriceUseCase} from '../contexts/accounting/application/port/in/ChangeTicketPriceUseCase';
import {EndDiningActivityInteractor} from '../contexts/accounting/application/use-case/EndDiningActivityInteractor';
import {EndDiningActivityUseCase} from '../contexts/accounting/application/port/in/EndDiningActivityUseCase';
import {
    AbandonDiningActivityInteractor
} from '../contexts/accounting/application/use-case/AbandonDiningActivityInteractor';
import {AbandonDiningActivityUseCase} from '../contexts/accounting/application/port/in/AbandonDiningActivityUseCase';
import {
    ReconcileConsumptionInteractor
} from '../contexts/accounting/application/use-case/ReconcileConsumptionInteractor';
import {ReconcileConsumptionUseCase} from '../contexts/accounting/application/port/in/ReconcileConsumptionUseCase';
import {GetDiningActivityInteractor} from '../contexts/accounting/application/use-case/GetDiningActivityInteractor';
import {GetDiningActivityUseCase} from '../contexts/accounting/application/port/in/GetDiningActivityUseCase';
import {GetConsumptionInteractor} from '../contexts/accounting/application/use-case/GetConsumptionInteractor';
import {GetConsumptionUseCase} from '../contexts/accounting/application/port/in/GetConsumptionUseCase';
import {
    ListDiningActivitiesInteractor
} from '../contexts/accounting/application/use-case/ListDiningActivitiesInteractor';
import {ListDiningActivitiesUseCase} from '../contexts/accounting/application/port/in/ListDiningActivitiesUseCase';
import {
    CalculateDiningResultInteractor
} from '../contexts/accounting/application/use-case/CalculateDiningResultInteractor';
import {CalculateDiningResultUseCase} from '../contexts/accounting/application/port/in/CalculateDiningResultUseCase';
import {PublishRestaurantInteractor} from '../contexts/catalog/application/use-case/PublishRestaurantInteractor';
import {PublishRestaurantUseCase} from '../contexts/catalog/application/port/in/PublishRestaurantUseCase';
import {DeleteRestaurantInteractor} from '../contexts/catalog/application/use-case/DeleteRestaurantInteractor';
import {DeleteRestaurantUseCase} from '../contexts/catalog/application/port/in/DeleteRestaurantUseCase';
import {CopyRestaurantToRoomInteractor} from '../contexts/catalog/application/use-case/CopyRestaurantToRoomInteractor';
import {CopyRestaurantToRoomUseCase} from '../contexts/catalog/application/port/in/CopyRestaurantToRoomUseCase';
import {
    ReplaceRoomRestaurantInteractor
} from '../contexts/catalog/application/use-case/ReplaceRoomRestaurantInteractor';
import {ReplaceRoomRestaurantUseCase} from '../contexts/catalog/application/port/in/ReplaceRoomRestaurantUseCase';
import {GetRestaurantInteractor} from '../contexts/catalog/application/use-case/GetRestaurantInteractor';
import {GetRestaurantUseCase} from '../contexts/catalog/application/port/in/GetRestaurantUseCase';
import {ListRestaurantsInteractor} from '../contexts/catalog/application/use-case/ListRestaurantsInteractor';
import {ListRestaurantsUseCase} from '../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import {OpenRoomInteractor} from '../contexts/collaboration/application/use-case/OpenRoomInteractor';
import {OpenRoomUseCase} from '../contexts/collaboration/application/port/in/OpenRoomUseCase';
import {JoinRoomInteractor} from '../contexts/collaboration/application/use-case/JoinRoomInteractor';
import {JoinRoomUseCase} from '../contexts/collaboration/application/port/in/JoinRoomUseCase';
import {LeaveRoomInteractor} from '../contexts/collaboration/application/use-case/LeaveRoomInteractor';
import {LeaveRoomUseCase} from '../contexts/collaboration/application/port/in/LeaveRoomUseCase';
import {TransferHostInteractor} from '../contexts/collaboration/application/use-case/TransferHostInteractor';
import {TransferHostUseCase} from '../contexts/collaboration/application/port/in/TransferHostUseCase';
import {EndRoomInteractor} from '../contexts/collaboration/application/use-case/EndRoomInteractor';
import {EndRoomUseCase} from '../contexts/collaboration/application/port/in/EndRoomUseCase';
import {AbandonRoomInteractor} from '../contexts/collaboration/application/use-case/AbandonRoomInteractor';
import {AbandonRoomUseCase} from '../contexts/collaboration/application/port/in/AbandonRoomUseCase';
import {GetRoomInteractor} from '../contexts/collaboration/application/use-case/GetRoomInteractor';
import {GetRoomUseCase} from '../contexts/collaboration/application/port/in/GetRoomUseCase';
import {ListRoomsInteractor} from '../contexts/collaboration/application/use-case/ListRoomsInteractor';
import {ListRoomsUseCase} from '../contexts/collaboration/application/port/in/ListRoomsUseCase';
import {AuthorizeRoomInteractor} from '../contexts/collaboration/application/use-case/AuthorizeRoomInteractor';
import {AuthorizeRoomUseCase} from '../contexts/collaboration/application/port/in/AuthorizeRoomUseCase';
import {
    AuthorizeCatalogSyncInteractor
} from '../contexts/collaboration/application/use-case/AuthorizeCatalogSyncInteractor';
import {AuthorizeCatalogSyncUseCase} from '../contexts/collaboration/application/port/in/AuthorizeCatalogSyncUseCase';
import {CreateSingleDiningInteractor} from '../coordination/application/use-case/CreateSingleDiningInteractor';
import {CreateSingleDiningUseCase} from '../coordination/application/port/in/CreateSingleDiningUseCase';
import {
    CreateMultiplayerDiningInteractor
} from '../coordination/application/use-case/CreateMultiplayerDiningInteractor';
import {CreateMultiplayerDiningUseCase} from '../coordination/application/port/in/CreateMultiplayerDiningUseCase';
import {JoinMultiplayerDiningInteractor} from '../coordination/application/use-case/JoinMultiplayerDiningInteractor';
import {JoinMultiplayerDiningUseCase} from '../coordination/application/port/in/JoinMultiplayerDiningUseCase';
import {IncreaseDiningProductInteractor} from '../coordination/application/use-case/IncreaseDiningProductInteractor';
import {IncreaseDiningProductUseCase} from '../coordination/application/port/in/IncreaseDiningProductUseCase';
import {DecreaseDiningProductInteractor} from '../coordination/application/use-case/DecreaseDiningProductInteractor';
import {DecreaseDiningProductUseCase} from '../coordination/application/port/in/DecreaseDiningProductUseCase';
import {RemoveDiningProductInteractor} from '../coordination/application/use-case/RemoveDiningProductInteractor';
import {RemoveDiningProductUseCase} from '../coordination/application/port/in/RemoveDiningProductUseCase';
import {ClearDiningRoundInteractor} from '../coordination/application/use-case/ClearDiningRoundInteractor';
import {ClearDiningRoundUseCase} from '../coordination/application/port/in/ClearDiningRoundUseCase';
import {SubmitDiningRoundInteractor} from '../coordination/application/use-case/SubmitDiningRoundInteractor';
import {SubmitDiningRoundUseCase} from '../coordination/application/port/in/SubmitDiningRoundUseCase';
import {
    ChangeDiningTicketPriceInteractor
} from '../coordination/application/use-case/ChangeDiningTicketPriceInteractor';
import {ChangeDiningTicketPriceUseCase} from '../coordination/application/port/in/ChangeDiningTicketPriceUseCase';
import {EndDiningInteractor} from '../coordination/application/use-case/EndDiningInteractor';
import {EndDiningUseCase} from '../coordination/application/port/in/EndDiningUseCase';
import {AbandonDiningInteractor} from '../coordination/application/use-case/AbandonDiningInteractor';
import {AbandonDiningUseCase} from '../coordination/application/port/in/AbandonDiningUseCase';
import {LeaveDiningRoomInteractor} from '../coordination/application/use-case/LeaveDiningRoomInteractor';
import {LeaveDiningRoomUseCase} from '../coordination/application/port/in/LeaveDiningRoomUseCase';
import {TransferDiningHostInteractor} from '../coordination/application/use-case/TransferDiningHostInteractor';
import {TransferDiningHostUseCase} from '../coordination/application/port/in/TransferDiningHostUseCase';
import {PublishLocalRestaurantInteractor} from '../coordination/application/use-case/PublishLocalRestaurantInteractor';
import {PublishLocalRestaurantUseCase} from '../coordination/application/port/in/PublishLocalRestaurantUseCase';
import {DeleteLocalRestaurantInteractor} from '../coordination/application/use-case/DeleteLocalRestaurantInteractor';
import {DeleteLocalRestaurantUseCase} from '../coordination/application/port/in/DeleteLocalRestaurantUseCase';
import {SyncRoomRestaurantInteractor} from '../coordination/application/use-case/SyncRoomRestaurantInteractor';
import {SyncRoomRestaurantUseCase} from '../coordination/application/port/in/SyncRoomRestaurantUseCase';
import {InitializeIdentityInteractor} from '../coordination/application/use-case/InitializeIdentityInteractor';
import {InitializeIdentityUseCase} from '../coordination/application/port/in/InitializeIdentityUseCase';
import {ChangeNicknameInteractor} from '../coordination/application/use-case/ChangeNicknameInteractor';
import {ChangeNicknameUseCase} from '../coordination/application/port/in/ChangeNicknameUseCase';
import {SelectDiningSessionInteractor} from '../coordination/application/use-case/SelectDiningSessionInteractor';
import {SelectDiningSessionUseCase} from '../coordination/application/port/in/SelectDiningSessionUseCase';
import {ClearDiningSessionInteractor} from '../coordination/application/use-case/ClearDiningSessionInteractor';
import {ClearDiningSessionUseCase} from '../coordination/application/port/in/ClearDiningSessionUseCase';
import {SaveReceiptInteractor} from '../coordination/application/use-case/SaveReceiptInteractor';
import {SaveReceiptUseCase} from '../coordination/application/port/in/SaveReceiptUseCase';
import {SaveDiningHistoryInteractor} from '../coordination/application/use-case/SaveDiningHistoryInteractor';
import {SaveDiningHistoryUseCase} from '../coordination/application/port/in/SaveDiningHistoryUseCase';
import {DeleteReceiptInteractor} from '../coordination/application/use-case/DeleteReceiptInteractor';
import {DeleteReceiptUseCase} from '../coordination/application/port/in/DeleteReceiptUseCase';
import {DeleteDiningHistoryInteractor} from '../coordination/application/use-case/DeleteDiningHistoryInteractor';
import {DeleteDiningHistoryUseCase} from '../coordination/application/port/in/DeleteDiningHistoryUseCase';
import {
    PublishRestaurantOriginalWorkflow
} from '../coordination/application/workflow/PublishRestaurantOriginalWorkflow';
import {PublishRestaurantOriginalUseCase} from '../coordination/application/port/in/PublishRestaurantOriginalUseCase';
import {DeleteRestaurantOriginalWorkflow} from '../coordination/application/workflow/DeleteRestaurantOriginalWorkflow';
import {DeleteRestaurantOriginalUseCase} from '../coordination/application/port/in/DeleteRestaurantOriginalUseCase';
import {GetDiningResultInteractor} from '../coordination/application/use-case/GetDiningResultInteractor';
import {GetDiningResultUseCase} from '../coordination/application/port/in/GetDiningResultUseCase';

export namespace Buffet {
    const personalRunner = Symbol('PersonalTransactionRunner');
    export type Options = {
        storage: ManifestStorage.Adapter;
        id: () => string;
        now: () => string;
        remote?: BatchRuntime.Remote;
    };

    export function create(options: Options, app?: App) {
        const prefix = 'buffet:v3:';
        const adapter: ManifestStorage.Adapter = {
            get: key => options.storage.get(prefix + key),
            set: (key, value) => options.storage.set(prefix + key, value),
            remove: key => options.storage.remove(prefix + key),
            keys: () => options.storage.keys?.().filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length)) || []
        };
        const runtime = new BatchRuntime.Runtime(new ManifestStorage.Store(adapter, options.id), options.id, options.remote);
        runtime.register(AccountingEventMapper.activityTypes, StorageDiningActivityRepository.project);
        runtime.register(AccountingEventMapper.consumptionTypes, StorageRestaurantConsumptionRepository.project);
        runtime.register(CatalogEventMapper.types, StorageRestaurantRepository.project);
        runtime.register(CollaborationEventMapper.types, StorageDiningRoomRepository.project);
        runtime.onCommitted('DiningEnded', PersonalResults.project);
        runtime.onCommitted('RoomEnded', PersonalResults.project);
        const localTransactions = new LocalDataTransactionRunner(runtime);
        const data = new StorageLocalDiningData(runtime, localTransactions);
        const remoteCatalog = options.remote?.uploadRestaurants && options.remote?.readRestaurants ? {
            uploadRestaurants: options.remote.uploadRestaurants.bind(options.remote),
            readRestaurants: options.remote.readRestaurants.bind(options.remote)
        } : undefined;
        const roomRestaurants = new RoomRestaurantPersistence(runtime, remoteCatalog);
        runtime.registerRoomBaseline((roomId, state) => roomRestaurants.restore(roomId, state));

        function register(scope: UniAppUseCaseScope, transactions: TransactionRunner, local: TransactionRunner) {
            const repositoryContext = new RepositoryTransaction(runtime, transactions);
            const diningActivityRepository = new StorageDiningActivityRepository(repositoryContext);
            const restaurantConsumptionRepository = new StorageRestaurantConsumptionRepository(repositoryContext);
            const restaurantRepository = new StorageRestaurantRepository(repositoryContext);
            const diningRoomRepository = new StorageDiningRoomRepository(repositoryContext);
            const diningActivityQuery = new StorageDiningActivityQuery(diningActivityRepository);
            const consumptionQuery = new StorageConsumptionQuery(restaurantConsumptionRepository);
            const restaurantQuery = new StorageRestaurantQuery(restaurantRepository);
            const roomQuery = new StorageRoomQuery(diningRoomRepository);
            scope.provide(TransactionRunner.token, transactions);
            scope.provide(personalRunner, local);
            scope.provide(DiningActivityRepository.token, diningActivityRepository);
            scope.provide(RestaurantConsumptionRepository.token, restaurantConsumptionRepository);
            scope.provide(RestaurantRepository.token, restaurantRepository);
            scope.provide(DiningRoomRepository.token, diningRoomRepository);
            scope.provide(DiningActivityQuery.token, diningActivityQuery);
            scope.provide(ConsumptionQuery.token, consumptionQuery);
            scope.provide(RestaurantQuery.token, restaurantQuery);
            scope.provide(RoomQuery.token, roomQuery);
            scope.provide(LocalDiningData.token, data);
            scope.provide(RoomRestaurantPublisher.token, roomRestaurants);
            scope.provide(CreateDiningActivityUseCase.token, new CreateDiningActivityInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityRepository>(DiningActivityRepository.token)));
            scope.provide(CreateConsumptionUseCase.token, new CreateConsumptionInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityRepository>(DiningActivityRepository.token), scope.resolve<RestaurantConsumptionRepository>(RestaurantConsumptionRepository.token)));
            scope.provide(IncreaseProductUseCase.token, new IncreaseProductInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityRepository>(DiningActivityRepository.token), scope.resolve<RestaurantConsumptionRepository>(RestaurantConsumptionRepository.token)));
            scope.provide(DecreaseProductUseCase.token, new DecreaseProductInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityRepository>(DiningActivityRepository.token), scope.resolve<RestaurantConsumptionRepository>(RestaurantConsumptionRepository.token)));
            scope.provide(RemoveConsumptionItemUseCase.token, new RemoveConsumptionItemInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityRepository>(DiningActivityRepository.token), scope.resolve<RestaurantConsumptionRepository>(RestaurantConsumptionRepository.token)));
            scope.provide(ClearRoundUseCase.token, new ClearRoundInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityRepository>(DiningActivityRepository.token), scope.resolve<RestaurantConsumptionRepository>(RestaurantConsumptionRepository.token)));
            scope.provide(SubmitRoundUseCase.token, new SubmitRoundInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityRepository>(DiningActivityRepository.token), scope.resolve<RestaurantConsumptionRepository>(RestaurantConsumptionRepository.token), options.id));
            scope.provide(ChangeTicketPriceUseCase.token, new ChangeTicketPriceInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityRepository>(DiningActivityRepository.token)));
            scope.provide(EndDiningActivityUseCase.token, new EndDiningActivityInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityRepository>(DiningActivityRepository.token), scope.resolve<RestaurantConsumptionRepository>(RestaurantConsumptionRepository.token)));
            scope.provide(AbandonDiningActivityUseCase.token, new AbandonDiningActivityInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityRepository>(DiningActivityRepository.token)));
            scope.provide(ReconcileConsumptionUseCase.token, new ReconcileConsumptionInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityRepository>(DiningActivityRepository.token), scope.resolve<RestaurantConsumptionRepository>(RestaurantConsumptionRepository.token)));
            scope.provide(GetDiningActivityUseCase.token, new GetDiningActivityInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityQuery>(DiningActivityQuery.token)));
            scope.provide(GetConsumptionUseCase.token, new GetConsumptionInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<ConsumptionQuery>(ConsumptionQuery.token)));
            scope.provide(ListDiningActivitiesUseCase.token, new ListDiningActivitiesInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityQuery>(DiningActivityQuery.token)));
            scope.provide(CalculateDiningResultUseCase.token, new CalculateDiningResultInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningActivityQuery>(DiningActivityQuery.token), scope.resolve<ConsumptionQuery>(ConsumptionQuery.token)));
            scope.provide(PublishRestaurantUseCase.token, new PublishRestaurantInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<RestaurantRepository>(RestaurantRepository.token)));
            scope.provide(DeleteRestaurantUseCase.token, new DeleteRestaurantInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<RestaurantRepository>(RestaurantRepository.token)));
            scope.provide(CopyRestaurantToRoomUseCase.token, new CopyRestaurantToRoomInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<RestaurantRepository>(RestaurantRepository.token)));
            scope.provide(ReplaceRoomRestaurantUseCase.token, new ReplaceRoomRestaurantInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<RestaurantRepository>(RestaurantRepository.token)));
            scope.provide(GetRestaurantUseCase.token, new GetRestaurantInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<RestaurantQuery>(RestaurantQuery.token)));
            scope.provide(ListRestaurantsUseCase.token, new ListRestaurantsInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<RestaurantQuery>(RestaurantQuery.token)));
            scope.provide(OpenRoomUseCase.token, new OpenRoomInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningRoomRepository>(DiningRoomRepository.token)));
            scope.provide(JoinRoomUseCase.token, new JoinRoomInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningRoomRepository>(DiningRoomRepository.token)));
            scope.provide(LeaveRoomUseCase.token, new LeaveRoomInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningRoomRepository>(DiningRoomRepository.token)));
            scope.provide(TransferHostUseCase.token, new TransferHostInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningRoomRepository>(DiningRoomRepository.token)));
            scope.provide(EndRoomUseCase.token, new EndRoomInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningRoomRepository>(DiningRoomRepository.token)));
            scope.provide(AbandonRoomUseCase.token, new AbandonRoomInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<DiningRoomRepository>(DiningRoomRepository.token)));
            scope.provide(GetRoomUseCase.token, new GetRoomInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<RoomQuery>(RoomQuery.token)));
            scope.provide(ListRoomsUseCase.token, new ListRoomsInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<RoomQuery>(RoomQuery.token)));
            scope.provide(AuthorizeRoomUseCase.token, new AuthorizeRoomInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<RoomQuery>(RoomQuery.token)));
            scope.provide(AuthorizeCatalogSyncUseCase.token, new AuthorizeCatalogSyncInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<RoomQuery>(RoomQuery.token)));
            scope.provide(CreateSingleDiningUseCase.token, new CreateSingleDiningInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<CreateDiningActivityUseCase>(CreateDiningActivityUseCase.token), scope.resolve<ListRestaurantsUseCase>(ListRestaurantsUseCase.token)));
            scope.provide(CreateMultiplayerDiningUseCase.token, new CreateMultiplayerDiningInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<CreateDiningActivityUseCase>(CreateDiningActivityUseCase.token), scope.resolve<ListRestaurantsUseCase>(ListRestaurantsUseCase.token), scope.resolve<PublishRestaurantUseCase>(PublishRestaurantUseCase.token), scope.resolve<RoomRestaurantPublisher>(RoomRestaurantPublisher.token), scope.resolve<OpenRoomUseCase>(OpenRoomUseCase.token)));
            scope.provide(JoinMultiplayerDiningUseCase.token, new JoinMultiplayerDiningInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<ListDiningActivitiesUseCase>(ListDiningActivitiesUseCase.token), scope.resolve<ReconcileConsumptionUseCase>(ReconcileConsumptionUseCase.token), scope.resolve<GetRestaurantUseCase>(GetRestaurantUseCase.token), scope.resolve<ReplaceRoomRestaurantUseCase>(ReplaceRoomRestaurantUseCase.token), scope.resolve<JoinRoomUseCase>(JoinRoomUseCase.token), scope.resolve<ListRoomsUseCase>(ListRoomsUseCase.token), options.now));
            scope.provide(IncreaseDiningProductUseCase.token, new IncreaseDiningProductInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<GetConsumptionUseCase>(GetConsumptionUseCase.token), scope.resolve<CreateConsumptionUseCase>(CreateConsumptionUseCase.token), scope.resolve<IncreaseProductUseCase>(IncreaseProductUseCase.token), scope.resolve<GetRestaurantUseCase>(GetRestaurantUseCase.token), scope.resolve<GetRoomUseCase>(GetRoomUseCase.token), scope.resolve<AuthorizeRoomUseCase>(AuthorizeRoomUseCase.token), options.id));
            scope.provide(DecreaseDiningProductUseCase.token, new DecreaseDiningProductInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<GetConsumptionUseCase>(GetConsumptionUseCase.token), scope.resolve<CreateConsumptionUseCase>(CreateConsumptionUseCase.token), scope.resolve<DecreaseProductUseCase>(DecreaseProductUseCase.token), scope.resolve<GetRestaurantUseCase>(GetRestaurantUseCase.token), scope.resolve<GetRoomUseCase>(GetRoomUseCase.token), scope.resolve<AuthorizeRoomUseCase>(AuthorizeRoomUseCase.token), options.id));
            scope.provide(RemoveDiningProductUseCase.token, new RemoveDiningProductInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<GetConsumptionUseCase>(GetConsumptionUseCase.token), scope.resolve<CreateConsumptionUseCase>(CreateConsumptionUseCase.token), scope.resolve<RemoveConsumptionItemUseCase>(RemoveConsumptionItemUseCase.token), scope.resolve<GetRestaurantUseCase>(GetRestaurantUseCase.token), scope.resolve<GetRoomUseCase>(GetRoomUseCase.token), scope.resolve<AuthorizeRoomUseCase>(AuthorizeRoomUseCase.token), options.id));
            scope.provide(ClearDiningRoundUseCase.token, new ClearDiningRoundInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<GetConsumptionUseCase>(GetConsumptionUseCase.token), scope.resolve<CreateConsumptionUseCase>(CreateConsumptionUseCase.token), scope.resolve<ClearRoundUseCase>(ClearRoundUseCase.token), scope.resolve<GetRestaurantUseCase>(GetRestaurantUseCase.token), scope.resolve<GetRoomUseCase>(GetRoomUseCase.token), scope.resolve<AuthorizeRoomUseCase>(AuthorizeRoomUseCase.token), options.id));
            scope.provide(SubmitDiningRoundUseCase.token, new SubmitDiningRoundInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<GetConsumptionUseCase>(GetConsumptionUseCase.token), scope.resolve<SubmitRoundUseCase>(SubmitRoundUseCase.token), scope.resolve<GetRoomUseCase>(GetRoomUseCase.token), scope.resolve<AuthorizeRoomUseCase>(AuthorizeRoomUseCase.token)));
            scope.provide(ChangeDiningTicketPriceUseCase.token, new ChangeDiningTicketPriceInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<ChangeTicketPriceUseCase>(ChangeTicketPriceUseCase.token), scope.resolve<GetRoomUseCase>(GetRoomUseCase.token), scope.resolve<AuthorizeRoomUseCase>(AuthorizeRoomUseCase.token)));
            scope.provide(EndDiningUseCase.token, new EndDiningInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<EndDiningActivityUseCase>(EndDiningActivityUseCase.token), scope.resolve<GetRestaurantUseCase>(GetRestaurantUseCase.token), scope.resolve<AuthorizeRoomUseCase>(AuthorizeRoomUseCase.token), scope.resolve<GetRoomUseCase>(GetRoomUseCase.token), scope.resolve<EndRoomUseCase>(EndRoomUseCase.token), options.now));
            scope.provide(AbandonDiningUseCase.token, new AbandonDiningInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<AbandonDiningActivityUseCase>(AbandonDiningActivityUseCase.token), scope.resolve<GetRoomUseCase>(GetRoomUseCase.token), scope.resolve<AuthorizeRoomUseCase>(AuthorizeRoomUseCase.token), scope.resolve<AbandonRoomUseCase>(AbandonRoomUseCase.token)));
            scope.provide(LeaveDiningRoomUseCase.token, new LeaveDiningRoomInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<LeaveRoomUseCase>(LeaveRoomUseCase.token), options.now));
            scope.provide(TransferDiningHostUseCase.token, new TransferDiningHostInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<GetRoomUseCase>(GetRoomUseCase.token), scope.resolve<AuthorizeRoomUseCase>(AuthorizeRoomUseCase.token), scope.resolve<TransferHostUseCase>(TransferHostUseCase.token)));
            scope.provide(PublishLocalRestaurantUseCase.token, new PublishLocalRestaurantInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<ListDiningActivitiesUseCase>(ListDiningActivitiesUseCase.token), scope.resolve<ReconcileConsumptionUseCase>(ReconcileConsumptionUseCase.token), scope.resolve<PublishRestaurantUseCase>(PublishRestaurantUseCase.token), scope.resolve<ListRoomsUseCase>(ListRoomsUseCase.token)));
            scope.provide(DeleteLocalRestaurantUseCase.token, new DeleteLocalRestaurantInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<ListDiningActivitiesUseCase>(ListDiningActivitiesUseCase.token), scope.resolve<ReconcileConsumptionUseCase>(ReconcileConsumptionUseCase.token), scope.resolve<GetRestaurantUseCase>(GetRestaurantUseCase.token), scope.resolve<DeleteRestaurantUseCase>(DeleteRestaurantUseCase.token), scope.resolve<ListRoomsUseCase>(ListRoomsUseCase.token)));
            scope.provide(SyncRoomRestaurantUseCase.token, new SyncRoomRestaurantInteractor(scope.resolve<TransactionRunner>(TransactionRunner.token), scope.resolve<ListDiningActivitiesUseCase>(ListDiningActivitiesUseCase.token), scope.resolve<ReconcileConsumptionUseCase>(ReconcileConsumptionUseCase.token), scope.resolve<ReplaceRoomRestaurantUseCase>(ReplaceRoomRestaurantUseCase.token), scope.resolve<GetRestaurantUseCase>(GetRestaurantUseCase.token), scope.resolve<PublishRestaurantUseCase>(PublishRestaurantUseCase.token), scope.resolve<AuthorizeRoomUseCase>(AuthorizeRoomUseCase.token), scope.resolve<AuthorizeCatalogSyncUseCase>(AuthorizeCatalogSyncUseCase.token), scope.resolve<ListRoomsUseCase>(ListRoomsUseCase.token)));
            scope.provide(InitializeIdentityUseCase.token, new InitializeIdentityInteractor(scope.resolve<TransactionRunner>(personalRunner), scope.resolve<LocalDiningData>(LocalDiningData.token)));
            scope.provide(ChangeNicknameUseCase.token, new ChangeNicknameInteractor(scope.resolve<TransactionRunner>(personalRunner), scope.resolve<LocalDiningData>(LocalDiningData.token)));
            scope.provide(SelectDiningSessionUseCase.token, new SelectDiningSessionInteractor(scope.resolve<TransactionRunner>(personalRunner), scope.resolve<LocalDiningData>(LocalDiningData.token)));
            scope.provide(ClearDiningSessionUseCase.token, new ClearDiningSessionInteractor(scope.resolve<TransactionRunner>(personalRunner), scope.resolve<LocalDiningData>(LocalDiningData.token)));
            scope.provide(SaveReceiptUseCase.token, new SaveReceiptInteractor(scope.resolve<TransactionRunner>(personalRunner), scope.resolve<LocalDiningData>(LocalDiningData.token)));
            scope.provide(SaveDiningHistoryUseCase.token, new SaveDiningHistoryInteractor(scope.resolve<TransactionRunner>(personalRunner), scope.resolve<LocalDiningData>(LocalDiningData.token), scope.resolve<GetRoomUseCase>(GetRoomUseCase.token)));
            scope.provide(DeleteReceiptUseCase.token, new DeleteReceiptInteractor(scope.resolve<TransactionRunner>(personalRunner), scope.resolve<LocalDiningData>(LocalDiningData.token)));
            scope.provide(DeleteDiningHistoryUseCase.token, new DeleteDiningHistoryInteractor(scope.resolve<TransactionRunner>(personalRunner), scope.resolve<LocalDiningData>(LocalDiningData.token)));
            scope.provide(PublishRestaurantOriginalUseCase.token, new PublishRestaurantOriginalWorkflow(scope.resolve<PublishLocalRestaurantUseCase>(PublishLocalRestaurantUseCase.token), scope.resolve<ListRoomsUseCase>(ListRoomsUseCase.token), scope.resolve<SyncRoomRestaurantUseCase>(SyncRoomRestaurantUseCase.token)));
            scope.provide(DeleteRestaurantOriginalUseCase.token, new DeleteRestaurantOriginalWorkflow(scope.resolve<DeleteLocalRestaurantUseCase>(DeleteLocalRestaurantUseCase.token), scope.resolve<ListRoomsUseCase>(ListRoomsUseCase.token), scope.resolve<SyncRoomRestaurantUseCase>(SyncRoomRestaurantUseCase.token)));
            scope.provide(GetDiningResultUseCase.token, new GetDiningResultInteractor(scope.resolve<CalculateDiningResultUseCase>(CalculateDiningResultUseCase.token), scope.resolve<GetRestaurantUseCase>(GetRestaurantUseCase.token), scope.resolve<GetRoomUseCase>(GetRoomUseCase.token)));
            return scope;
        }

        function scoped(tx: Transaction.Context, owner: TransactionRunner = runtime) {
            owner.assertActive(tx, tx.scopeId, tx.roomId);
            const runner = new ActiveTransactionRunner(owner, tx);
            return register(new UniAppUseCaseScope(createSSRApp({})), runner, runner);
        }

        const root = register(new UniAppUseCaseScope(app || createSSRApp({})), new UseCaseTransactionRunner(runtime, tx => scoped(tx)), new UseCaseTransactionRunner(localTransactions, tx => scoped(tx, localTransactions)));
        const scope = root;
        const dining = new DiningApplication(scope.resolve<InitializeIdentityUseCase>(InitializeIdentityUseCase.token), scope.resolve<ChangeNicknameUseCase>(ChangeNicknameUseCase.token), scope.resolve<SelectDiningSessionUseCase>(SelectDiningSessionUseCase.token), scope.resolve<CreateSingleDiningUseCase>(CreateSingleDiningUseCase.token), scope.resolve<CreateMultiplayerDiningUseCase>(CreateMultiplayerDiningUseCase.token), scope.resolve<JoinMultiplayerDiningUseCase>(JoinMultiplayerDiningUseCase.token), scope.resolve<IncreaseDiningProductUseCase>(IncreaseDiningProductUseCase.token), scope.resolve<DecreaseDiningProductUseCase>(DecreaseDiningProductUseCase.token), scope.resolve<RemoveDiningProductUseCase>(RemoveDiningProductUseCase.token), scope.resolve<ClearDiningRoundUseCase>(ClearDiningRoundUseCase.token), scope.resolve<SubmitDiningRoundUseCase>(SubmitDiningRoundUseCase.token), scope.resolve<ChangeDiningTicketPriceUseCase>(ChangeDiningTicketPriceUseCase.token), scope.resolve<GetDiningResultUseCase>(GetDiningResultUseCase.token), scope.resolve<EndDiningUseCase>(EndDiningUseCase.token), scope.resolve<AbandonDiningUseCase>(AbandonDiningUseCase.token), scope.resolve<LeaveDiningRoomUseCase>(LeaveDiningRoomUseCase.token), scope.resolve<ClearDiningSessionUseCase>(ClearDiningSessionUseCase.token), scope.resolve<TransferDiningHostUseCase>(TransferDiningHostUseCase.token), scope.resolve<SaveReceiptUseCase>(SaveReceiptUseCase.token), scope.resolve<SaveDiningHistoryUseCase>(SaveDiningHistoryUseCase.token), scope.resolve<DeleteReceiptUseCase>(DeleteReceiptUseCase.token), scope.resolve<DeleteDiningHistoryUseCase>(DeleteDiningHistoryUseCase.token), scope.resolve<PublishRestaurantOriginalUseCase>(PublishRestaurantOriginalUseCase.token), scope.resolve<DeleteRestaurantOriginalUseCase>(DeleteRestaurantOriginalUseCase.token), scope.resolve<SyncRoomRestaurantUseCase>(SyncRoomRestaurantUseCase.token), scope.resolve<ListDiningActivitiesUseCase>(ListDiningActivitiesUseCase.token), scope.resolve<GetConsumptionUseCase>(GetConsumptionUseCase.token), scope.resolve<ListRestaurantsUseCase>(ListRestaurantsUseCase.token), scope.resolve<ListRoomsUseCase>(ListRoomsUseCase.token), scope.resolve<LocalDiningData>(LocalDiningData.token), options.id, options.now);
        runtime.subscribe(() => {
            try {
                dining.refresh();
            } catch (error) {
                console.error('查询刷新失败；写命令不会重发', error);
            }
        });
        return {runtime, dining, resolve: <T>(token: UseCase.Token<T>) => root.resolve<T>(token), scope: scoped};
    }

    export function uniStorage(): ManifestStorage.Adapter {
        return {
            get: key => {
                const v = uni.getStorageSync(key);
                return typeof v === 'string' && v.length ? v : undefined;
            }, set: (key, value) => {
                uni.setStorageSync(key, value);
            }, remove: key => {
                uni.removeStorageSync(key);
            }, keys: () => uni.getStorageInfoSync().keys
        };
    }

    export function relay(baseUrl: string): UniRoomRelay.Client {
        return new UniRoomRelay.Client(baseUrl);
    }
}
