import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Catalog} from './Catalog';

export interface GetRestaurantUseCase extends UseCase<GetRestaurantUseCase.Request, GetRestaurantUseCase.Response> {
    execute(request: GetRestaurantUseCase.Request): GetRestaurantUseCase.Response;
}

export namespace GetRestaurantUseCase {
    export const token = Symbol('GetRestaurantUseCase') as InjectionToken<GetRestaurantUseCase>;

    export type Context = Readonly<{available?: boolean; privateOnly?: boolean; productId?: string}>;

    export class Request extends UseCase.Request {
        constructor(readonly catalogScope: string, readonly restaurantId: string, readonly context?: GetRestaurantUseCase.Context) {
            super();
            if (context?.productId !== undefined) UseCase.id(context.productId);
            this.context = UseCase.dto(context);
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
