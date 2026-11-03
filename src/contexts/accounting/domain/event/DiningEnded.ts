import {DomainEvent} from '../../../../kernel/domain/DomainEvent';
import type {DiningResult} from '../value-object/DiningResult';

export class DiningEnded extends DomainEvent<DiningEnded.Facts> {
    readonly type = 'DiningEnded' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: DiningEnded.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace DiningEnded {
    export type Facts = Readonly<{
        result: DiningResult.Snapshot;
    }>;
}
