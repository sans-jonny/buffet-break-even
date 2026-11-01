import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class RestaurantDeleted extends DomainEvent<RestaurantDeleted.Facts> {
    readonly type = 'RestaurantDeleted' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: RestaurantDeleted.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace RestaurantDeleted {
    export type Facts = Readonly<{
        sourceVersion?: number;
    }>;
}
