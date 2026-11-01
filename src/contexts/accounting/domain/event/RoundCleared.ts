import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class RoundCleared extends DomainEvent<RoundCleared.Facts> {
    readonly type = 'RoundCleared' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: RoundCleared.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace RoundCleared {
    export type Facts = Readonly<{
        roundId: string;
    }>;
}
