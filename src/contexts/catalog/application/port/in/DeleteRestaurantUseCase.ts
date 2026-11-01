import {UseCase} from '../../../../../kernel/application/UseCase';
import {Catalog} from './Catalog';

export interface DeleteRestaurantUseCase extends UseCase<DeleteRestaurantUseCase.Request, DeleteRestaurantUseCase.Response> {
    execute(request: DeleteRestaurantUseCase.Request): Promise<DeleteRestaurantUseCase.Response>;
}

export namespace DeleteRestaurantUseCase {
    export const token = Symbol('DeleteRestaurantUseCase') as UseCase.Token<DeleteRestaurantUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope, readonly catalogScope: string, readonly restaurantId: string) {
            super(scope);
            UseCase.id(catalogScope);
            UseCase.id(restaurantId);
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
