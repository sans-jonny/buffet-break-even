import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class MemberRejoined extends DomainEvent<MemberRejoined.Facts> {
    readonly type = 'MemberRejoined' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: MemberRejoined.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace MemberRejoined {
    export type Facts = Readonly<{
        memberId: string;
    }>;
}
