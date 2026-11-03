import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class RoundSubmitted extends DomainEvent<RoundSubmitted.Facts> {
    readonly type = 'RoundSubmitted' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: RoundSubmitted.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace RoundSubmitted {
    export type Facts = Readonly<{
        roundId: string;
    }>;
}
