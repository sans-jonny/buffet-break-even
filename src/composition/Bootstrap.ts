import {PersonalStore} from '../stores/business/PersonalStore';
import {ProductImageClient} from '../infrastructure/media/ProductImageClient';
import {InitializeDiningUseCase} from '../coordination/application/port/in/initialization/InitializeDiningUseCase';
import {RoomConnection} from '../coordination/application/port/out/session/RoomConnection';
import {RoomGateway} from '../coordination/application/port/out/session/RoomGateway';
import {DiningPreferences} from '../coordination/application/port/out/session/DiningPreferences';
import {CoordinationComposition} from '../coordination/composition/CoordinationComposition';
import {CollaborationComposition} from '../contexts/collaboration/composition/CollaborationComposition';
import {CatalogComposition} from '../contexts/catalog/composition/CatalogComposition';
import {AccountingComposition} from '../contexts/accounting/composition/AccountingComposition';
import {RoomRestaurantPublisher} from '../coordination/application/port/out/catalog/RoomRestaurantPublisher';
import {RoomRestaurantPersistence} from '../infrastructure/storage/RoomRestaurantPersistence';
import {RepositoryTransaction} from '../infrastructure/storage/RepositoryTransaction';
import type {App} from 'vue';
import {ManifestStorage} from '../infrastructure/storage/ManifestStorage';
import {BatchRuntime} from '../infrastructure/projection/BatchRuntime';
import {UniRoomRelay} from '../infrastructure/event-store/UniRoomRelay';
import {PersonalResults} from '../infrastructure/projection/PersonalResults';
import {LocalDataTransactionRunner} from '../infrastructure/storage/LocalDataTransactionRunner';
import {StorageLocalDiningData} from '../infrastructure/storage/StorageLocalDiningData';
import {DiningStore} from '../stores/business/DiningStore';
import {QueryClientProvider} from '../infrastructure/query/QueryClientProvider';
import {QueryInvalidationAdapter} from '../infrastructure/query/QueryInvalidationAdapter';
import {createPinia} from 'pinia';
import {UniAppUseCaseScope} from './UniAppUseCaseScope';
import {ActiveTransactionRunner} from '../infrastructure/dependency-injection/ActiveTransactionRunner';
import {UseCaseTransactionRunner} from '../infrastructure/dependency-injection/UseCaseTransactionRunner';
import {TransactionRunner} from '../kernel/application/TransactionRunner';
import {Transaction} from '../kernel/application/Transaction';
import {UseCase} from '../kernel/application/UseCase';
import {LocalDiningData} from '../coordination/application/port/out/device/LocalDiningData';
import {StorageDiningPreferences} from '../infrastructure/storage/StorageDiningPreferences';
import {ManagedRoomConnection} from '../infrastructure/event-store/ManagedRoomConnection';
import {ReferenceDiningCatalog} from './ReferenceDiningCatalog';
import {CatalogStore} from '../stores/business/CatalogStore';
import {AccountingStore} from '../stores/business/AccountingStore';
import {CollaborationStore} from '../stores/business/CollaborationStore';
import {MenuPageStateStore} from '../stores/page-state/MenuPageStateStore';
import {PublishRestaurantOriginalUseCase} from '../coordination/application/port/in/catalog/PublishRestaurantOriginalUseCase';
import {DeleteRestaurantOriginalUseCase} from '../coordination/application/port/in/catalog/DeleteRestaurantOriginalUseCase';
import {ListDiningActivitiesUseCase} from '../contexts/accounting/application/port/in/ListDiningActivitiesUseCase';
import {ListRestaurantsUseCase} from '../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import {ListRoomsUseCase} from '../contexts/collaboration/application/port/in/ListRoomsUseCase';
import {GetConsumptionUseCase} from '../contexts/accounting/application/port/in/GetConsumptionUseCase';
import {GetDiningResultUseCase} from '../coordination/application/port/in/dining/GetDiningResultUseCase';
import {GetPersonalDiningUseCase} from '../coordination/application/port/in/device/GetPersonalDiningUseCase';
import {SessionStore} from '../stores/business/SessionStore';
import {DiningAppLifecycle} from '../infrastructure/lifecycle/DiningAppLifecycle';
import {RefreshDiningSessionUseCase} from '../coordination/application/port/in/session/RefreshDiningSessionUseCase';
import {GetPendingCatalogSyncUseCase} from '../coordination/application/port/in/catalog/GetPendingCatalogSyncUseCase';
import {RetryCatalogSyncUseCase} from '../coordination/application/port/in/catalog/RetryCatalogSyncUseCase';

export namespace Bootstrap {
    const personalRunner = Symbol('PersonalTransactionRunner') as UseCase.Token<TransactionRunner>;
    export type Options = {
        storage: ManifestStorage.Adapter;
        id: () => string;
        now: () => string;
        remote?: BatchRuntime.Remote;
        media?: RoomRestaurantPersistence.Media;
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
        AccountingComposition.registerRuntime(runtime);
        CatalogComposition.registerRuntime(runtime);
        CollaborationComposition.registerRuntime(runtime);
        runtime.onCommitted('DiningEnded', PersonalResults.project);
        runtime.onCommitted('RoomEnded', PersonalResults.project);
        const localTransactions = new LocalDataTransactionRunner(runtime);
        const data = new StorageLocalDiningData(runtime, localTransactions);
        const remoteCatalog = options.remote?.uploadRestaurants && options.remote?.readRestaurants ? {
            uploadRestaurants: options.remote.uploadRestaurants.bind(options.remote),
            readRestaurants: options.remote.readRestaurants.bind(options.remote)
        } : undefined;
        const roomRestaurants = new RoomRestaurantPersistence(runtime, remoteCatalog, options.media);
        runtime.registerRoomBaseline((roomId, state) => roomRestaurants.restore(roomId, state));

        function register(scope: UniAppUseCaseScope, transactions: TransactionRunner, local: TransactionRunner) {
            const repositoryContext = new RepositoryTransaction(runtime, transactions);
            scope.provide(TransactionRunner.token, transactions);
            scope.provide(personalRunner, local);
            scope.provide(LocalDiningData.token, data);
            scope.provide(RoomRestaurantPublisher.token, roomRestaurants);
            AccountingComposition.register(scope, repositoryContext, options);
            CatalogComposition.register(scope, repositoryContext);
            CollaborationComposition.register(scope, repositoryContext);
            CoordinationComposition.register(scope, options, personalRunner);
            return scope;
        }

        function scoped(tx: Transaction.Context, owner: TransactionRunner = runtime) {
            owner.assertActive(tx, tx.scopeId, tx.roomId);
            const runner = new ActiveTransactionRunner(owner, tx);
            return register(new UniAppUseCaseScope(), runner, runner);
        }

        const root = register(new UniAppUseCaseScope(app), new UseCaseTransactionRunner(runtime, tx => scoped(tx)), new UseCaseTransactionRunner(localTransactions, tx => scoped(tx, localTransactions)));
        const queries = new QueryClientProvider({
            activities: root.resolve(ListDiningActivitiesUseCase.token),
            restaurants: root.resolve(ListRestaurantsUseCase.token),
            rooms: root.resolve(ListRoomsUseCase.token),
            consumption: root.resolve(GetConsumptionUseCase.token),
            result: root.resolve(GetDiningResultUseCase.token),
            personal: root.resolve(GetPersonalDiningUseCase.token),
            pendingCatalogSync: root.resolve(GetPendingCatalogSyncUseCase.token)
        }, options.now, app ? 5 * 60 * 1000 : Infinity);
        const releaseHeadless = app ? undefined : queries.acquire();
        root.provide(QueryClientProvider.token, queries);
        const invalidation = new QueryInvalidationAdapter(queries.client);
        const unsubscribe = runtime.subscribe(event => invalidation.onInvalidated(event));
        const pinia = createPinia();
        if (app) app.use(pinia);
        const dining = DiningStore.create(root, queries, pinia);
        const catalog = CatalogStore.create(queries, root.resolve(PublishRestaurantOriginalUseCase.token),
            root.resolve(DeleteRestaurantOriginalUseCase.token), root.resolve(RetryCatalogSyncUseCase.token), pinia);
        const accounting = AccountingStore.create(queries, pinia);
        const collaboration = CollaborationStore.create(root, queries, pinia);
        const personal = PersonalStore.create(root, queries, pinia);
        const menuPageState = MenuPageStateStore.create(pinia);
        root.provide(DiningStore.token, dining);
        root.provide(CatalogStore.token, catalog);
        root.provide(AccountingStore.token, accounting);
        root.provide(CollaborationStore.token, collaboration);
        root.provide(PersonalStore.token, personal);
        root.provide(MenuPageStateStore.token, menuPageState);
        return {runtime, dining, catalog, accounting, collaboration, personal, menuPageState, queries, pinia,
            provide: <T>(token: UseCase.Token<T>, implementation: NoInfer<T>) => root.provide(token, implementation),
            resolve: <T>(token: UseCase.Token<T>) => root.resolve(token), scope: scoped,
            dispose: () => { releaseHeadless?.(); unsubscribe(); dining.$dispose(); catalog.$dispose(); accounting.$dispose(); collaboration.$dispose(); personal.$dispose(); menuPageState.$dispose(); queries.dispose(); }};
    }

    export async function device(baseUrl: string, id: () => string, report: (error: unknown) => void, app?: App) {
        const relay = new UniRoomRelay.Client(baseUrl);
        const media = new ProductImageClient(baseUrl);
        const core = create({storage: uniStorage(), id, now: () => new Date().toISOString(), remote: relay, media}, app);
        const preferences = new StorageDiningPreferences(core.runtime);
        const connection = new ManagedRoomConnection(relay, core.runtime, core.runtime, report, roomId => media.refresh(roomId));
        core.provide(RoomGateway.token, relay);
        core.provide(RoomConnection.token, connection);
        core.provide(DiningPreferences.token, preferences);
        core.provide(ProductImageClient.token, media);
        CoordinationComposition.registerSessions(core, id);
        const sessionStore = SessionStore.create(core, core.queries, core.pinia);
        core.provide(SessionStore.token, sessionStore);
        const lifecycle = new DiningAppLifecycle(core.resolve(RefreshDiningSessionUseCase.token), connection, report);
        core.provide(DiningAppLifecycle.token, lifecycle);
        try {
            await media.initialize();
            await media.importLegacy(core.runtime.entries('catalog/local/restaurant/'));
            await core.resolve(InitializeDiningUseCase.token).execute(new InitializeDiningUseCase.Request(ReferenceDiningCatalog.restaurants()));
            return {...core, sessionStore, lifecycle,
                dispose: () => { lifecycle.dispose(); sessionStore.$dispose(); core.dispose(); }};
        } catch (error) {
            lifecycle.dispose(); sessionStore.$dispose(); core.dispose();
            throw error;
        }
    }

    /** UniApp calls createApp synchronously; defer its generated mount until initialization succeeds. */
    export function start(app: App, initialize: () => Promise<unknown>): Promise<void> {
        const mount = app.mount.bind(app);
        let ready = false, mounted = false, pending: Parameters<App['mount']> | undefined;
        app.mount = ((...args: Parameters<App['mount']>) => {
            if (mounted) return;
            if (ready) { mounted = true; return mount(...args); }
            pending ||= args;
        }) as App['mount'];
        return Promise.resolve().then(initialize).then(() => {
            ready = true;
            if (pending) { mounted = true; mount(...pending); }
        });
    }

    export function id(): string {
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
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
