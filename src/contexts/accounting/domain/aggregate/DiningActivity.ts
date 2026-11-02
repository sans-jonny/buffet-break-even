import {AggregateRoot} from '../../../../kernel/domain/AggregateRoot';
import {Domain} from '../../../../kernel/domain/Domain';
import {Money} from '../value-object/Money';
import {DiningResult} from '../value-object/DiningResult';
import {DiningStarted} from '../event/DiningStarted';
import {TicketPriceChanged} from '../event/TicketPriceChanged';
import {DiningEnded} from '../event/DiningEnded';
import {DiningAbandoned} from '../event/DiningAbandoned';
import {DiningActivityRejected} from '../rejection/DiningActivityRejected';

export class DiningActivity extends AggregateRoot<DiningActivity.State> {
    readonly mode: 'SINGLE' | 'SHARED';
    readonly status: 'ACTIVE' | 'ENDED' | 'ABANDONED';
    readonly ticketPriceMinor: number;
    readonly restaurantIds: readonly string[];
    readonly restaurantCategoryId: string;
    readonly result?: DiningResult.Snapshot;

    private constructor(state: DiningActivity.State) {
        super(state.id, state.version);
        this.mode = Domain.copy(state.mode);
        this.status = Domain.copy(state.status);
        this.ticketPriceMinor = Domain.copy(state.ticketPriceMinor);
        this.restaurantIds = Domain.copy(state.restaurantIds);
        this.restaurantCategoryId = state.restaurantCategoryId;
        this.result = Domain.copy(state.result);
    }

    static reconstitute(state: DiningActivity.State): DiningActivity {
        Domain.require(Money.isTicket(state.ticketPriceMinor) && ['ACTIVE', 'ENDED', 'ABANDONED'].includes(state.status), 'INVALID_ACTIVITY_SNAPSHOT');
        Domain.require(state.status !== 'ENDED' || !!state.result, 'INVALID_ACTIVITY_SNAPSHOT');
        Domain.require(Array.isArray(state.restaurantIds) && state.restaurantIds.length > 0 && state.restaurantIds.every(id => !!id.trim())
            && new Set(state.restaurantIds).size === state.restaurantIds.length, 'INVALID_ACTIVITY_RESTAURANTS');
        Domain.require(typeof state.restaurantCategoryId === 'string' && !!state.restaurantCategoryId.trim(), 'INVALID_RESTAURANT_CATEGORY');
        return new DiningActivity(state);
    }

    static create(id: string,
                  ticketPrice: Money.Amount,
                  mode: 'SINGLE' | 'SHARED',
                  restaurantIds: readonly string[], restaurantCategoryId: string): DiningStarted | DiningActivityRejected {
        if (!id.trim() || !Money.isTicket(ticketPrice.minor))
            return new DiningActivityRejected('INVALID_TICKET_PRICE');
        if (!Array.isArray(restaurantIds) || !restaurantIds.length || restaurantIds.some(id => !id.trim()) || new Set(restaurantIds).size !== restaurantIds.length)
            return new DiningActivityRejected('INVALID_ACTIVITY_RESTAURANTS');
        if (typeof restaurantCategoryId !== 'string' || !restaurantCategoryId.trim()) return new DiningActivityRejected('INVALID_RESTAURANT_CATEGORY');
        return new DiningStarted(id, 0, {mode, ticketPriceMinor: ticketPrice.minor, restaurantIds, restaurantCategoryId});
    }

    snapshot(): DiningActivity.State {
        return Domain.copy({
            id: this.id,
            version: this.version,
            mode: this.mode,
            status: this.status,
            ticketPriceMinor: this.ticketPriceMinor,
            restaurantIds: this.restaurantIds,
            restaurantCategoryId: this.restaurantCategoryId,
            result: this.result
        });
    }

    authorizeRestaurant(restaurantId: string): void {
        Domain.require(this.restaurantIds.includes(restaurantId), 'RESTAURANT_NOT_IN_ACTIVITY');
    }

    changeTicketPrice(ticketPrice: Money.Amount): TicketPriceChanged | DiningActivityRejected {
        if (this.status !== 'ACTIVE')
            return new DiningActivityRejected('ALREADY_ENDED');
        if (!Money.isTicket(ticketPrice.minor))
            return new DiningActivityRejected('INVALID_TICKET_PRICE');
        return new TicketPriceChanged(this.id, this.version, {ticketPriceMinor: ticketPrice.minor});
    }

    end(result: DiningResult): DiningEnded | DiningActivityRejected {
        if (this.status !== 'ACTIVE')
            return new DiningActivityRejected('ALREADY_ENDED');
        if (result.snapshot.activityId !== this.id || result.snapshot.ticketPriceMinor !== this.ticketPriceMinor)
            return new DiningActivityRejected('INCONSISTENT_RESULT');
        if (!this.restaurantIds.includes(result.restaurantId))
            return new DiningActivityRejected('RESTAURANT_NOT_IN_ACTIVITY');
        return new DiningEnded(this.id, this.version, {result: result.snapshot});
    }

    abandon(): DiningAbandoned | DiningActivityRejected {
        if (this.status !== 'ACTIVE')
            return new DiningActivityRejected('ALREADY_ENDED');
        return new DiningAbandoned(this.id, this.version);
    }
}

export namespace DiningActivity {
    export type Event = DiningStarted | TicketPriceChanged | DiningEnded | DiningAbandoned;
    export type State = Readonly<{
        id: string;
        version: number;
        mode: 'SINGLE' | 'SHARED';
        status: 'ACTIVE' | 'ENDED' | 'ABANDONED';
        ticketPriceMinor: number;
        restaurantIds: readonly string[];
        restaurantCategoryId: string;
        result?: DiningResult.Snapshot;
    }>;
}
