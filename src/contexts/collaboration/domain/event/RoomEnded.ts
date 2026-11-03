import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class RoomEnded extends DomainEvent<RoomEnded.Facts> {
    readonly type = 'RoomEnded' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: RoomEnded.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace RoomEnded {
    export type Facts = Readonly<{
        eligibleIds: readonly string[];
    }>;
}
