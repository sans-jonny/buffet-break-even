import {DomainEvent} from '../../../../kernel/domain/DomainEvent';
import type {RoomMember} from '../entity/RoomMember';

export class MemberJoined extends DomainEvent<MemberJoined.Facts> {
    readonly type = 'MemberJoined' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: MemberJoined.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace MemberJoined {
    export type Facts = Readonly<{
        member: RoomMember.Snapshot;
        hostId: string;
        nextOrder: number;
    }>;
}
