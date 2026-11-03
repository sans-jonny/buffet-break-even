import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import type {Catalog} from '../in/Catalog';

export interface RestaurantQuery {
    getById(scope: string, id: string): Catalog.RestaurantView | undefined;

    list(scope: string): readonly Catalog.RestaurantView[];
}

export namespace RestaurantQuery {
    export const token = Symbol('RestaurantQuery') as InjectionToken<RestaurantQuery>;
}
