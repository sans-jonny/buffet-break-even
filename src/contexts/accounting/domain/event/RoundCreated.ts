import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class RoundCreated extends DomainEvent<RoundCreated.Facts> {
    readonly type = 'RoundCreated' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: RoundCreated.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace RoundCreated {
    export type Facts = Readonly<{
        roundId: string;
    }>;
}
