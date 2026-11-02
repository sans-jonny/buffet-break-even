import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Catalog} from './Catalog';

export interface GetRestaurantUseCase extends UseCase<GetRestaurantUseCase.Request, GetRestaurantUseCase.Response> {
    execute(request: GetRestaurantUseCase.Request): GetRestaurantUseCase.Response;
}

export namespace GetRestaurantUseCase {
    export const token = Symbol('GetRestaurantUseCase') as InjectionToken<GetRestaurantUseCase>;

    export class Request extends UseCase.Request {
        constructor(readonly catalogScope: string, readonly restaurantId: string) {
            super();
            UseCase.id(catalogScope);
            UseCase.id(restaurantId);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Catalog.RestaurantView | undefined;

        constructor(value: Catalog.RestaurantView | undefined) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
