import type {Restaurant} from '../../../domain/aggregate/Restaurant';

export namespace Catalog {
    export type RestaurantView = Restaurant.State;
    export type Product = Restaurant.Product;
}
