import {Domain} from '../../src/kernel/domain/Domain';
import {DomainEvent} from '../../src/kernel/domain/DomainEvent';
import {SerializedEvent} from '../../src/kernel/application/SerializedEvent';
import {AccountingEventMapper} from '../../src/contexts/accounting/adapter/persistence/AccountingEventMapper';
import {CatalogEventMapper} from '../../src/contexts/catalog/adapter/persistence/CatalogEventMapper';
import {CollaborationEventMapper} from '../../src/contexts/collaboration/adapter/persistence/CollaborationEventMapper';
import {DiningActivity} from '../../src/contexts/accounting/domain/aggregate/DiningActivity';
import {RestaurantConsumption} from '../../src/contexts/accounting/domain/aggregate/RestaurantConsumption';
import {Restaurant} from '../../src/contexts/catalog/domain/aggregate/Restaurant';
import {DiningRoom} from '../../src/contexts/collaboration/domain/aggregate/DiningRoom';
/** Specification vocabulary for applying a decided fact to a known version. */
export namespace DomainScenario {
    function apply(event: DomainEvent, before: object | undefined, prefix: string, project: typeof AccountingEventMapper.apply): unknown {
        const key = prefix + event.aggregateId, state: Record<string, unknown> = before ? {[key]: Domain.copy(before)} : {};
        project(SerializedEvent.fact(event, key), state);
        return state[key];
    }
    export function activity(event: DiningActivity.Event, before?: DiningActivity.State): DiningActivity.State { return apply(event, before, 'accounting/activity/', AccountingEventMapper.apply) as DiningActivity.State; }
    export function consumption(event: RestaurantConsumption.Event, before?: RestaurantConsumption.State): RestaurantConsumption.State { return apply(event, before, 'accounting/consumption/', AccountingEventMapper.apply) as RestaurantConsumption.State; }
    export function restaurant(event: Restaurant.Event, before?: Restaurant.State): Restaurant.State { return apply(event, before, 'catalog/local/restaurant/', CatalogEventMapper.apply) as Restaurant.State; }
    export function room(event: DiningRoom.Event, before?: DiningRoom.State): DiningRoom.State { return apply(event, before, 'collaboration/room/', CollaborationEventMapper.apply) as DiningRoom.State; }
}
