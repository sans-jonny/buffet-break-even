import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class ConsumptionItemRemoved extends DomainEvent<ConsumptionItemRemoved.Facts> {
    readonly type = 'ConsumptionItemRemoved' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: ConsumptionItemRemoved.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace ConsumptionItemRemoved {
    export type Facts = Readonly<{
        roundId: string;
        productId: string;
    }>;
}
