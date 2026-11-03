import {AggregateRoot} from '../../../../kernel/domain/AggregateRoot';
import {Domain} from '../../../../kernel/domain/Domain';
import {Round} from '../entity/Round';
import {RestaurantConsumptionRejected} from '../rejection/RestaurantConsumptionRejected';
import {ConsumptionStarted} from '../event/ConsumptionStarted';
import {ProductQuantityIncreased} from '../event/ProductQuantityIncreased';
import {ProductQuantityDecreased} from '../event/ProductQuantityDecreased';
import {ConsumptionItemRemoved} from '../event/ConsumptionItemRemoved';
import {RoundCleared} from '../event/RoundCleared';
import {RoundSubmitted} from '../event/RoundSubmitted';
import {RoundCreated} from '../event/RoundCreated';
import {ConsumptionItemsReconciled} from '../event/ConsumptionItemsReconciled';
import {ConsumptionFinalized} from '../event/ConsumptionFinalized';
import {ConsumptionRemoved} from '../event/ConsumptionRemoved';

export class RestaurantConsumption extends AggregateRoot<RestaurantConsumption.State> {
    readonly activityId: string;
    readonly restaurantId: string;
    readonly rounds: readonly Round.Snapshot[];
    readonly finalized: boolean;

    private constructor(state: RestaurantConsumption.State) {
        super(state.id, state.version);
        this.activityId = Domain.copy(state.activityId);
        this.restaurantId = Domain.copy(state.restaurantId);
        this.rounds = Domain.copy(state.rounds);
        this.finalized = Domain.copy(state.finalized);
    }

    static reconstitute(state: RestaurantConsumption.State): RestaurantConsumption {
        state.rounds.forEach(r => new Round(r));
        Domain.require(state.rounds.filter(r => r.status === 'ACTIVE').length <= 1 && new Set(state.rounds.map(r => r.id)).size === state.rounds.length, 'INVALID_ROUNDS');
        return new RestaurantConsumption(state);
    }

    static create(activityId: string, restaurantId: string, roundId: string): ConsumptionStarted {
        Domain.require(!!activityId.trim() && !!restaurantId.trim() && !!roundId.trim(), 'INVALID_ID');
        return new ConsumptionStarted(`${activityId}/${restaurantId}`, 0, {activityId, restaurantId, roundId});
    }

    snapshot(): RestaurantConsumption.State {
        return Domain.copy({
            id: this.id,
            version: this.version,
            activityId: this.activityId,
            restaurantId: this.restaurantId,
            rounds: this.rounds,
            finalized: this.finalized
        });
    }

    activeRoundId(): string | undefined {
        return this.rounds.find(r => r.status === 'ACTIVE')?.id;
    }

    increaseProduct(roundId: string,
                    productId: string,
                    quantity: number): ProductQuantityIncreased | RestaurantConsumptionRejected {
        const round = this.editable(roundId);
        if (round instanceof RestaurantConsumptionRejected)
            return round;
const total = (round.items[productId] || 0) + quantity;
        if (!Domain.positive(total))
            return new RestaurantConsumptionRejected('QUANTITY_OVERFLOW');
        return new ProductQuantityIncreased(this.id, this.version, {roundId, productId, quantity});
    }

    decreaseProduct(roundId: string,
                    productId: string,
                    quantity: number): ProductQuantityDecreased | RestaurantConsumptionRejected {
        const round = this.editable(roundId);
        if (round instanceof RestaurantConsumptionRejected)
            return round;
if ((round.items[productId] || 0) < quantity)
            return new RestaurantConsumptionRejected('INSUFFICIENT_QUANTITY');
        return new ProductQuantityDecreased(this.id, this.version, {roundId, productId, quantity});
    }

    removeProduct(roundId: string, productId: string): ConsumptionItemRemoved | RestaurantConsumptionRejected {
        const round = this.editable(roundId);
        if (round instanceof RestaurantConsumptionRejected)
            return round;
        return new ConsumptionItemRemoved(this.id, this.version, {roundId, productId});
    }

    clearRound(roundId: string): RoundCleared | RestaurantConsumptionRejected {
        const round = this.editable(roundId);
        return round instanceof RestaurantConsumptionRejected ? round : new RoundCleared(this.id, this.version, {roundId});
    }

    submitRound(roundId: string): RoundSubmitted | RestaurantConsumptionRejected {
        const round = this.editable(roundId);
        if (round instanceof RestaurantConsumptionRejected)
            return round;
        if (new Round(round).isEmpty())
            return new RestaurantConsumptionRejected('EMPTY_ROUND');
        return new RoundSubmitted(this.id, this.version, {roundId});
    }

    createNextRound(roundId: string): RoundCreated | RestaurantConsumptionRejected {
        if (this.finalized)
            return new RestaurantConsumptionRejected('CONSUMPTION_ENDED');
        if (this.rounds.some(r => r.status === 'ACTIVE' || r.id === roundId))
            return new RestaurantConsumptionRejected('ROUND_ALREADY_EXISTS');
        return new RoundCreated(this.id, this.version, {roundId});
    }

    retainProducts(validProductIds: readonly string[]): ConsumptionItemsReconciled | RestaurantConsumptionRejected {
        if (this.finalized)
            return new RestaurantConsumptionRejected('CONSUMPTION_ENDED');
        const removedProductIds = [...new Set(this.rounds.flatMap(r => Object.keys(r.items)).filter(id => !validProductIds.includes(id)))];
        return new ConsumptionItemsReconciled(this.id, this.version, {removedProductIds});
    }

    finalize(): ConsumptionFinalized | RestaurantConsumptionRejected {
        if (this.finalized)
            return new RestaurantConsumptionRejected('CONSUMPTION_ENDED');
        return new ConsumptionFinalized(this.id, this.version);
    }

    discard(): ConsumptionRemoved | RestaurantConsumptionRejected {
        return this.finalized ? new RestaurantConsumptionRejected('CONSUMPTION_ENDED') : new ConsumptionRemoved(this.id, this.version);
    }

    private editable(roundId: string): Round.Snapshot | RestaurantConsumptionRejected {
        if (this.finalized)
            return new RestaurantConsumptionRejected('CONSUMPTION_ENDED');
        const round = this.rounds.find(r => r.id === roundId);
        return round && new Round(round).canEdit() ? round : new RestaurantConsumptionRejected('ROUND_LOCKED');
    }
}

export namespace RestaurantConsumption {
    export type Event =
        ConsumptionStarted
        | ProductQuantityIncreased
        | ProductQuantityDecreased
        | ConsumptionItemRemoved
        | RoundCleared
        | RoundSubmitted
        | RoundCreated
        | ConsumptionItemsReconciled
        | ConsumptionFinalized
        | ConsumptionRemoved;
    export type State = Readonly<{
        id: string;
        activityId: string;
        restaurantId: string;
        version: number;
        rounds: readonly Round.Snapshot[];
        finalized: boolean;
    }>;
}
