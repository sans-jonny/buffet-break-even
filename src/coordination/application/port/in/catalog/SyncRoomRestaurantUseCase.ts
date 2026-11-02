import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface SyncRoomRestaurantUseCase extends UseCase<SyncRoomRestaurantUseCase.Request, SyncRoomRestaurantUseCase.Response> {
    execute(request: SyncRoomRestaurantUseCase.Request): Promise<SyncRoomRestaurantUseCase.Response>;
}

export namespace SyncRoomRestaurantUseCase {
    export const token = Symbol('SyncRoomRestaurantUseCase') as InjectionToken<SyncRoomRestaurantUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly roomId: string, readonly actorId: string, readonly original: Dining.Restaurant) {
            super({scopeId: roomId, roomId});
            UseCase.id(roomId);
            UseCase.id(actorId);
            UseCase.id(original.id);
            this.original = UseCase.dto(original);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Dining.Restaurant;

        constructor(value: Dining.Restaurant) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
