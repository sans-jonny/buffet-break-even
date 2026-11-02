import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class DiningStarted extends DomainEvent<DiningStarted.Facts> {
    readonly type = 'DiningStarted' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: DiningStarted.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace DiningStarted {
    export type Facts = Readonly<{
        mode: 'SINGLE' | 'SHARED';
        ticketPriceMinor: number;
        restaurantIds: readonly string[];
        restaurantCategoryId: string;
    }>;
}
