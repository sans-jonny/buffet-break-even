import {RestaurantInput} from './RestaurantInput';
import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Catalog} from './Catalog';

export interface PublishRestaurantUseCase extends UseCase<PublishRestaurantUseCase.Request, PublishRestaurantUseCase.Response> {
    execute(request: PublishRestaurantUseCase.Request): Promise<PublishRestaurantUseCase.Response>;
}

export namespace PublishRestaurantUseCase {
    export const token = Symbol('PublishRestaurantUseCase') as InjectionToken<PublishRestaurantUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope, readonly catalogScope: string, readonly restaurant: Catalog.RestaurantView) {
            super(scope);
            UseCase.id(catalogScope);
            RestaurantInput.validate(restaurant);
            this.restaurant = UseCase.dto(restaurant);
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
