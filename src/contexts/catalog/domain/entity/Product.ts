import {Domain} from '../../../../kernel/domain/Domain';
import {Money} from '../value-object/Money';

export class Product {
    readonly id: string;
    readonly categoryId: string;
    readonly name: string;
    readonly priceMinor: number;

    constructor(snapshot: Product.Snapshot) {
        Domain.require(!!snapshot.id.trim() && !!snapshot.categoryId.trim() && !!snapshot.name.trim() && Money.isPrice(snapshot.priceMinor), 'INVALID_PRODUCT');
        this.id = Domain.copy(snapshot.id);
        this.categoryId = Domain.copy(snapshot.categoryId);
        this.name = Domain.copy(snapshot.name);
        this.priceMinor = Domain.copy(snapshot.priceMinor);
    }

    get snapshot(): Product.Snapshot {
        return Domain.copy({id: this.id, categoryId: this.categoryId, name: this.name, priceMinor: this.priceMinor});
    }
}

export namespace Product {
    export type Snapshot = Readonly<{
        id: string;
        categoryId: string;
        name: string;
        priceMinor: number;
    }>;
}
