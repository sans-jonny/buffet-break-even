import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Catalog} from './Catalog';

export interface ListRestaurantsUseCase extends UseCase<ListRestaurantsUseCase.Request, ListRestaurantsUseCase.Response> {
    execute(request: ListRestaurantsUseCase.Request): ListRestaurantsUseCase.Response;
}

export namespace ListRestaurantsUseCase {
    export const token = Symbol('ListRestaurantsUseCase') as InjectionToken<ListRestaurantsUseCase>;

    export class Request extends UseCase.Request {
        constructor(readonly catalogScope: string, readonly includeDeleted = false) {
            super();
            UseCase.id(catalogScope);
            this.includeDeleted = UseCase.dto(includeDeleted);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: readonly Catalog.RestaurantView[];

        constructor(value: readonly Catalog.RestaurantView[]) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
