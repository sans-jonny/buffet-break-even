import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class RoomAbandoned extends DomainEvent<RoomAbandoned.Facts> {
    readonly type = 'RoomAbandoned' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: RoomAbandoned.Facts = {}) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace RoomAbandoned {
    export type Facts = Readonly<Record<string, never>>;
}
