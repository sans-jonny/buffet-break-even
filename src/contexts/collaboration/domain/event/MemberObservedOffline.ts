import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class MemberObservedOffline extends DomainEvent<MemberObservedOffline.Facts> {
    readonly type = 'MemberObservedOffline' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: MemberObservedOffline.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace MemberObservedOffline {
    export type Facts = Readonly<{
        memberId: string;
        hostId: string | null;
        emptySince: string | null;
    }>;
}
