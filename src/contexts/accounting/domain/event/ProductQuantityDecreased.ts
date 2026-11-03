import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class ProductQuantityDecreased extends DomainEvent<ProductQuantityDecreased.Facts> {
    readonly type = 'ProductQuantityDecreased' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: ProductQuantityDecreased.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace ProductQuantityDecreased {
    export type Facts = Readonly<{
        roundId: string;
        productId: string;
        quantity: number;
    }>;
}
