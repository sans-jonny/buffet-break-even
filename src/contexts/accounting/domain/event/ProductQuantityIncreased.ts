import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class ProductQuantityIncreased extends DomainEvent<ProductQuantityIncreased.Facts> {
    readonly type = 'ProductQuantityIncreased' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: ProductQuantityIncreased.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace ProductQuantityIncreased {
    export type Facts = Readonly<{
        roundId: string;
        productId: string;
        quantity: number;
    }>;
}
