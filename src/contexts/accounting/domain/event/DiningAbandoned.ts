import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class DiningAbandoned extends DomainEvent<DiningAbandoned.Facts> {
    readonly type = 'DiningAbandoned' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: DiningAbandoned.Facts = {}) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace DiningAbandoned {
    export type Facts = Readonly<Record<string, never>>;
}
