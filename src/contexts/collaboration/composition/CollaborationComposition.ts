import type {InjectionToken} from '../../../kernel/application/InjectionToken';
import {RepositoryTransaction} from '../../../infrastructure/storage/RepositoryTransaction';
import {BatchRuntime} from '../../../infrastructure/projection/BatchRuntime';
import {CollaborationEventMapper} from '../adapter/persistence/CollaborationEventMapper';
import {UniAppUseCaseScope} from '../../../composition/UniAppUseCaseScope';
import {TransactionRunner} from '../../../kernel/application/TransactionRunner';
import {DiningRoomRepository} from '../application/port/out/DiningRoomRepository';
import {StorageDiningRoomRepository} from '../adapter/persistence/StorageDiningRoomRepository';
import {RoomQuery} from '../application/port/out/RoomQuery';
import {StorageRoomQuery} from '../adapter/persistence/StorageRoomQuery';
import {OpenRoomInteractor} from '../application/use-case/OpenRoomInteractor';
import {OpenRoomUseCase} from '../application/port/in/OpenRoomUseCase';
import {JoinRoomInteractor} from '../application/use-case/JoinRoomInteractor';
import {JoinRoomUseCase} from '../application/port/in/JoinRoomUseCase';
import {LeaveRoomInteractor} from '../application/use-case/LeaveRoomInteractor';
import {LeaveRoomUseCase} from '../application/port/in/LeaveRoomUseCase';
import {TransferHostInteractor} from '../application/use-case/TransferHostInteractor';
import {TransferHostUseCase} from '../application/port/in/TransferHostUseCase';
import {EndRoomInteractor} from '../application/use-case/EndRoomInteractor';
import {EndRoomUseCase} from '../application/port/in/EndRoomUseCase';
import {AbandonRoomInteractor} from '../application/use-case/AbandonRoomInteractor';
import {AbandonRoomUseCase} from '../application/port/in/AbandonRoomUseCase';
import {GetRoomInteractor} from '../application/use-case/GetRoomInteractor';
import {GetRoomUseCase} from '../application/port/in/GetRoomUseCase';
import {ListRoomsInteractor} from '../application/use-case/ListRoomsInteractor';
import {ListRoomsUseCase} from '../application/port/in/ListRoomsUseCase';
import {AuthorizeRoomInteractor} from '../application/use-case/AuthorizeRoomInteractor';
import {AuthorizeRoomUseCase} from '../application/port/in/AuthorizeRoomUseCase';
import {
    AuthorizeCatalogSyncInteractor
} from '../application/use-case/AuthorizeCatalogSyncInteractor';
import {AuthorizeCatalogSyncUseCase} from '../application/port/in/AuthorizeCatalogSyncUseCase';

export namespace CollaborationComposition {
    export function registerRuntime(runtime: BatchRuntime.Runtime): void {
        runtime.register(CollaborationEventMapper.types, StorageDiningRoomRepository.project);
    }
    export function register(scope: UniAppUseCaseScope, repositoryContext: RepositoryTransaction, options: {id: () => string; now: () => string}, personalRunner: InjectionToken<TransactionRunner>): void {
        const diningRoomRepository = new StorageDiningRoomRepository(repositoryContext);
        scope.provide(DiningRoomRepository.token, diningRoomRepository);
        scope.provide(RoomQuery.token, new StorageRoomQuery(diningRoomRepository));
        scope.provide(OpenRoomUseCase.token, new OpenRoomInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningRoomRepository.token)));
        scope.provide(JoinRoomUseCase.token, new JoinRoomInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningRoomRepository.token)));
        scope.provide(LeaveRoomUseCase.token, new LeaveRoomInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningRoomRepository.token)));
        scope.provide(TransferHostUseCase.token, new TransferHostInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningRoomRepository.token)));
        scope.provide(EndRoomUseCase.token, new EndRoomInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningRoomRepository.token)));
        scope.provide(AbandonRoomUseCase.token, new AbandonRoomInteractor(scope.resolve(TransactionRunner.token), scope.resolve(DiningRoomRepository.token)));
        scope.provide(GetRoomUseCase.token, new GetRoomInteractor(scope.resolve(TransactionRunner.token), scope.resolve(RoomQuery.token)));
        scope.provide(ListRoomsUseCase.token, new ListRoomsInteractor(scope.resolve(TransactionRunner.token), scope.resolve(RoomQuery.token)));
        scope.provide(AuthorizeRoomUseCase.token, new AuthorizeRoomInteractor(scope.resolve(TransactionRunner.token), scope.resolve(RoomQuery.token)));
        scope.provide(AuthorizeCatalogSyncUseCase.token, new AuthorizeCatalogSyncInteractor(scope.resolve(TransactionRunner.token), scope.resolve(RoomQuery.token)));
    }
}
