import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import type {RestaurantConsumption} from '../../../domain/aggregate/RestaurantConsumption';
import type {DomainRejection} from '../../../../../kernel/domain/DomainRejection';

export interface RestaurantConsumptionRepository {
    findById(id: string): RestaurantConsumption | undefined;

    all(): readonly RestaurantConsumption[];

    apply(event: RestaurantConsumption.Event | DomainRejection): Promise<RestaurantConsumption | undefined>;
}

export namespace RestaurantConsumptionRepository {
    export const token = Symbol('RestaurantConsumptionRepository') as InjectionToken<RestaurantConsumptionRepository>;
}
