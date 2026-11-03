import type {DiningActivity} from '../../../domain/aggregate/DiningActivity';
import type {RestaurantConsumption} from '../../../domain/aggregate/RestaurantConsumption';
import type {DiningResult} from '../../../domain/value-object/DiningResult';
import type {ConsumptionCalculator} from '../../../domain/service/ConsumptionCalculator';

export namespace Accounting {
    export type Activity = DiningActivity.State;
    export type Consumption = RestaurantConsumption.State;
    export type Result = DiningResult.Snapshot;
    export type Catalog = ConsumptionCalculator.Catalog;
}
