import {DomainEvent} from '../../../../kernel/domain/DomainEvent';
import type {Category} from '../entity/Category';
import type {Product} from '../entity/Product';

export class RestaurantPublished extends DomainEvent<RestaurantPublished.Facts> {
    readonly type = 'RestaurantPublished' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: RestaurantPublished.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace RestaurantPublished {
    export type Facts = Readonly<{
        name: string;
        restaurantCategory: Readonly<{id: string; name: string}>;
        type: 'PUBLIC' | 'PRIVATE' | 'ROOM_COPY';
        deleted: boolean;
        categories: readonly Category.Snapshot[];
        products: readonly Product.Snapshot[];
        sourceId?: string;
        sourceVersion?: number;
    }>;
}
