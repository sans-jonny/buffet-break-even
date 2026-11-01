import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class ConsumptionRemoved extends DomainEvent<ConsumptionRemoved.Facts> {
    readonly type = 'ConsumptionRemoved' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: ConsumptionRemoved.Facts = {}) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace ConsumptionRemoved {
    export type Facts = Readonly<Record<string, never>>;
}
