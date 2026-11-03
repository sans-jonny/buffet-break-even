import {Domain} from '../../../../kernel/domain/Domain';

export class ConsumptionItem {
    constructor(readonly productId: string, readonly quantity: number) {
        Domain.require(!!productId.trim() && Domain.minor(quantity), 'INVALID_CONSUMPTION_ITEM');
    }

    equals(other: ConsumptionItem): boolean {
        return this.productId === other.productId && this.quantity === other.quantity;
    }
}
