import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {computed} from 'vue';
import {defineStore, type Pinia} from 'pinia';
import {QueryClientProvider} from '../../infrastructure/query/QueryClientProvider';
import type {UniAppUseCaseScope} from '../../composition/UniAppUseCaseScope';
import {CommandState} from '../CommandState';
import {Domain} from '../../kernel/domain/Domain';
import type {Dining} from '../../coordination/application/dto/Dining';
import {TransferDiningHostUseCase} from '../../coordination/application/port/in/room/TransferDiningHostUseCase';
import {SyncRoomRestaurantUseCase} from '../../coordination/application/port/in/catalog/SyncRoomRestaurantUseCase';

export namespace CollaborationStore {
    export const token = Symbol('CollaborationStore') as InjectionToken<ReturnType<typeof create>>;
    export function create(scope: Pick<UniAppUseCaseScope, 'resolve'>, queries: QueryClientProvider, pinia: Pinia) {
        return defineStore('collaboration', () => {
            const transfer = scope.resolve(TransferDiningHostUseCase.token);
            const synchronize = scope.resolve(SyncRoomRestaurantUseCase.token);
            const commands = CommandState.create(queries);
            const current = () => {
                const {session, identity} = queries.personal();
                Domain.require(session, 'NO_DINING_SESSION');
                Domain.require(session.roomId, 'ROOM_REQUIRED');
                Domain.require(identity, 'IDENTITY_REQUIRED');
                return {session, actorId: identity.id};
            };
            return {
                rooms: computed(() => queries.rooms()),
                findRoom: (roomId: string) => queries.rooms().find(room => room.id === roomId),
                loading: commands.loading, error: commands.error,
                transfer: (targetId: string) => commands.run(() => {
                    const {session, actorId} = current();
                    return transfer.execute(new TransferDiningHostUseCase.Request(session, actorId, targetId));
                }),
                synchronizePrivate: (original: Dining.Restaurant) => commands.run(() => {
                    const {session, actorId} = current();
                    return synchronize.execute(new SyncRoomRestaurantUseCase.Request(session.roomId!, actorId, original));
                })
            };
        })(pinia);
    }
}
