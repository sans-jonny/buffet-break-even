import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Catalog} from './Catalog';

export interface CopyRestaurantToRoomUseCase extends UseCase<CopyRestaurantToRoomUseCase.Request, CopyRestaurantToRoomUseCase.Response> {
    execute(request: CopyRestaurantToRoomUseCase.Request): Promise<CopyRestaurantToRoomUseCase.Response>;
}

export namespace CopyRestaurantToRoomUseCase {
    export const token = Symbol('CopyRestaurantToRoomUseCase') as InjectionToken<CopyRestaurantToRoomUseCase>;

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
