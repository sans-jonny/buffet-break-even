import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class RoomOpened extends DomainEvent<RoomOpened.Facts> {
    readonly type = 'RoomOpened' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: RoomOpened.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace RoomOpened {
    export type Facts = Readonly<{
        code: string;
        activityId: string;
        creatorId: string;
        nickname: string;
        privateSourceIds: readonly string[];
    }>;
}
