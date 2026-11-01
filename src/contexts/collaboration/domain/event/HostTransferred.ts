import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class HostTransferred extends DomainEvent<HostTransferred.Facts> {
    readonly type = 'HostTransferred' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: HostTransferred.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace HostTransferred {
    export type Facts = Readonly<{
        hostId: string;
    }>;
}
