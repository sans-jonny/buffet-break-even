import {UseCase} from '../../../../../kernel/application/UseCase';
import {Catalog} from './Catalog';

export interface ReplaceRoomRestaurantUseCase extends UseCase<ReplaceRoomRestaurantUseCase.Request, ReplaceRoomRestaurantUseCase.Response> {
    execute(request: ReplaceRoomRestaurantUseCase.Request): Promise<ReplaceRoomRestaurantUseCase.Response>;
}

export namespace ReplaceRoomRestaurantUseCase {
    export const token = Symbol('ReplaceRoomRestaurantUseCase') as UseCase.Token<ReplaceRoomRestaurantUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope, readonly roomId: string, readonly original: Catalog.RestaurantView) {
            super(scope);
            UseCase.id(roomId);
            UseCase.id(original.id);
            this.original = UseCase.dto(original);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Catalog.RestaurantView;

        constructor(value: Catalog.RestaurantView) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
