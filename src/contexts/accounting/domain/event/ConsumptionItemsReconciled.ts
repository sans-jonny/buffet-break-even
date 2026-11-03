import {DomainEvent} from '../../../../kernel/domain/DomainEvent';

export class ConsumptionItemsReconciled extends DomainEvent<ConsumptionItemsReconciled.Facts> {
    readonly type = 'ConsumptionItemsReconciled' as const;

    constructor(aggregateId: string, expectedVersion: number, facts: ConsumptionItemsReconciled.Facts) {
        super(aggregateId, expectedVersion, facts);
    }
}

export namespace ConsumptionItemsReconciled {
    export type Facts = Readonly<{
        removedProductIds: readonly string[];
    }>;
}
