import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class ConsumptionStarted extends DomainEvent<ConsumptionStarted.Facts> {
    readonly type = 'ConsumptionStarted' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: ConsumptionStarted.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace ConsumptionStarted {
    export type Facts = Readonly<{
        activityId: string;
        restaurantId: string;
        roundId: string;
    }>;
}
