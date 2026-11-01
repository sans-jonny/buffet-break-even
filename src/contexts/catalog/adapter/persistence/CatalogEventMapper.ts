import {Domain} from '../../../../kernel/domain/Domain';
import {AggregateConflictError} from '../../../../kernel/application/AggregateConflictError';
import {Transaction} from '../../../../kernel/application/Transaction';
import {SerializedEvent} from '../../../../kernel/application/SerializedEvent';
import {Restaurant} from '../../domain/aggregate/Restaurant';
import {RestaurantPersistenceRecord} from './RestaurantPersistenceRecord';

export class CatalogEventMapper {
    static readonly types = ['RestaurantPublished', 'RestaurantDeleted'];

    static apply(event: SerializedEvent.Fact, state: Transaction.State): void {
        const e = SerializedEvent.decode<Restaurant.Event>(event),
            before = state[event.key] as Restaurant.State | undefined;
        if (e.expectedVersion !== (before?.version || 0))
            throw new AggregateConflictError(e.aggregateId, e.expectedVersion, before?.version || 0);
        Domain.require(/^catalog\/[^/]+\/restaurant\//.test(event.key) && event.key.endsWith('/' + e.aggregateId), 'INVALID_EVENT_TARGET');
        Domain.require(before || e.type === 'RestaurantPublished', 'AGGREGATE_NOT_FOUND');
        const next = e.type === 'RestaurantPublished'
            ? {id: e.aggregateId, version: e.expectedVersion + 1, ...e.facts}
            : {
                ...before!,
                version: e.expectedVersion + 1,
                deleted: true, ...(e.facts.sourceVersion === undefined ? {} : {sourceVersion: e.facts.sourceVersion})
            };
        state[event.key] = Restaurant.reconstitute(RestaurantPersistenceRecord.normalize(next)).snapshot();
    }
}
