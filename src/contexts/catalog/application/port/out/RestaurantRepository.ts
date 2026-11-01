import type {Restaurant} from '../../../domain/aggregate/Restaurant';
import type {DomainRejection} from '../../../../../kernel/domain/DomainRejection';

export interface RestaurantRepository {
    findById(scope: string, id: string): Restaurant | undefined;

    all(scope: string): readonly Restaurant[];

    apply(scope: string, event: Restaurant.Event | DomainRejection): Promise<Restaurant | undefined>;
}

export namespace RestaurantRepository {
    export const token = Symbol('RestaurantRepository');
}
