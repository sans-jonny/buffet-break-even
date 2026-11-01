import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class ConsumptionFinalized extends DomainEvent<ConsumptionFinalized.Facts> {
    readonly type = 'ConsumptionFinalized' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: ConsumptionFinalized.Facts = {}) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace ConsumptionFinalized {
    export type Facts = Readonly<Record<string, never>>;
}
