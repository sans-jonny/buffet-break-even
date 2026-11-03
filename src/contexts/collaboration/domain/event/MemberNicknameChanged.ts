import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class MemberNicknameChanged extends DomainEvent<MemberNicknameChanged.Facts> {
    readonly type = 'MemberNicknameChanged' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: MemberNicknameChanged.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace MemberNicknameChanged {
    export type Facts = Readonly<{
        memberId: string;
        nickname: string;
    }>;
}
