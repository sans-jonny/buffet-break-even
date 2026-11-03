import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class MemberLeft extends DomainEvent<MemberLeft.Facts> {
    readonly type = 'MemberLeft' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: MemberLeft.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace MemberLeft {
    export type Facts = Readonly<{
        memberId: string;
        hostId: string | null;
        emptySince: string | null;
    }>;
}
