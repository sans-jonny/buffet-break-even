import {Domain} from '../../../../kernel/domain/Domain';
import {AggregateConflictError} from '../../../../kernel/application/AggregateConflictError';
import {Transaction} from '../../../../kernel/application/Transaction';
import {SerializedEvent} from '../../../../kernel/application/SerializedEvent';
import {PersistedRecord} from '../../../../infrastructure/storage/PersistedRecord';
import {DiningActivity} from '../../domain/aggregate/DiningActivity';
import {RestaurantConsumption} from '../../domain/aggregate/RestaurantConsumption';

export class AccountingEventMapper {
    static readonly activityTypes = ['DiningStarted', 'TicketPriceChanged', 'DiningEnded', 'DiningAbandoned'];
    static readonly consumptionTypes = ['ConsumptionStarted', 'ProductQuantityIncreased', 'ProductQuantityDecreased', 'ConsumptionItemRemoved', 'RoundCleared', 'RoundCreated', 'RoundSubmitted', 'ConsumptionItemsReconciled', 'ConsumptionFinalized', 'ConsumptionRemoved'];
    static readonly types = [...AccountingEventMapper.activityTypes, ...AccountingEventMapper.consumptionTypes];

    static apply(event: SerializedEvent.Fact, state: Transaction.State): void {
        const e = SerializedEvent.decode<DiningActivity.Event | RestaurantConsumption.Event>(event);
        const before = state[event.key] as DiningActivity.State | RestaurantConsumption.State | undefined;
        const actualVersion = before?.version || 0;
        if (e.expectedVersion !== actualVersion)
            throw new AggregateConflictError(e.aggregateId, e.expectedVersion, actualVersion);
        const activity = AccountingEventMapper.activityTypes.includes(e.type);
        Domain.require(event.key === (activity ? 'accounting/activity/' : 'accounting/consumption/') + e.aggregateId, 'INVALID_EVENT_TARGET');
        if (activity)
            state[event.key] = AccountingEventMapper.activity(e as DiningActivity.Event, before as DiningActivity.State | undefined);
        else {
            const next = AccountingEventMapper.consumption(e as RestaurantConsumption.Event, before as RestaurantConsumption.State | undefined);
            if (next)
                state[event.key] = next;
            else
                delete state[event.key];
        }
    }

    private static activity(e: DiningActivity.Event, before?: DiningActivity.State): DiningActivity.State {
        if (e.type === 'DiningStarted')
            return DiningActivity.reconstitute({
                id: e.aggregateId,
                version: e.expectedVersion + 1,
                mode: e.facts.mode,
                ticketPriceMinor: e.facts.ticketPriceMinor,
                restaurantIds: e.facts.restaurantIds,
                restaurantCategoryId: e.facts.restaurantCategoryId,
                status: 'ACTIVE'
            }).snapshot();
        Domain.require(before, 'AGGREGATE_NOT_FOUND');
        const next = PersistedRecord.copy(before);
        switch (e.type) {
            case 'TicketPriceChanged':
                next.ticketPriceMinor = e.facts.ticketPriceMinor;
                break;
            case 'DiningEnded':
                next.status = 'ENDED';
                next.result = PersistedRecord.copy(e.facts.result);
                break;
            case 'DiningAbandoned':
                next.status = 'ABANDONED';
                break;
        }
        next.version = e.expectedVersion + 1;
        return DiningActivity.reconstitute(next).snapshot();
    }

    private static consumption(e: RestaurantConsumption.Event,
                               before?: RestaurantConsumption.State): RestaurantConsumption.State | undefined {
        if (e.type === 'ConsumptionStarted')
            return RestaurantConsumption.reconstitute({
                id: e.aggregateId,
                version: e.expectedVersion + 1,
                activityId: e.facts.activityId,
                restaurantId: e.facts.restaurantId,
                finalized: false,
                rounds: [{id: e.facts.roundId, status: 'ACTIVE', items: {}}]
            }).snapshot();
        Domain.require(before, 'AGGREGATE_NOT_FOUND');
        const next = PersistedRecord.copy(before);
        switch (e.type) {
            case 'ProductQuantityIncreased':
            case 'ProductQuantityDecreased': {
                const round = next.rounds.find(r => r.id === e.facts.roundId);
                Domain.require(round, 'INVALID_EVENT_ROUND');
                const quantity = (round.items[e.facts.productId] || 0) + (e.type === 'ProductQuantityIncreased' ? e.facts.quantity : -e.facts.quantity);
                Domain.require(Domain.positive(e.facts.quantity) && Domain.minor(quantity), 'INVALID_EVENT_QUANTITY');
                if (quantity)
                    round.items[e.facts.productId] = quantity;
                else
                    delete round.items[e.facts.productId];
                break;
            }
            case 'ConsumptionItemRemoved':
            case 'RoundCleared':
            case 'RoundSubmitted': {
                const round = next.rounds.find(r => r.id === e.facts.roundId);
                Domain.require(round, 'INVALID_EVENT_ROUND');
                if (e.type === 'ConsumptionItemRemoved')
                    delete round.items[e.facts.productId];
                else if (e.type === 'RoundCleared')
                    round.items = {};
                else
                    round.status = 'SUBMITTED';
                break;
            }
            case 'RoundCreated':
                next.rounds.push({id: e.facts.roundId, status: 'ACTIVE', items: {}});
                break;
            case 'ConsumptionItemsReconciled':
                for (const round of next.rounds)
                    for (const id of e.facts.removedProductIds)
                        delete round.items[id];
                next.rounds = next.rounds.filter(r => r.status === 'ACTIVE' || Object.keys(r.items).length);
                break;
            case 'ConsumptionFinalized':
                next.finalized = true;
                next.rounds = next.rounds.filter(r => Object.keys(r.items).length).map(r => ({
                    ...r,
                    status: 'SUBMITTED'
                }));
                break;
            case 'ConsumptionRemoved':
                return undefined;
        }
        next.version = e.expectedVersion + 1;
        return RestaurantConsumption.reconstitute(next).snapshot();
    }
}
