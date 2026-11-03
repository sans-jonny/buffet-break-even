import {Domain} from '../../../../kernel/domain/Domain';

/** A catalog price is non-negative; it does not expose accounting profit semantics. */
export namespace Money {
    export const isPrice = (minor: number): boolean => Domain.minor(minor);

    export function pricedAt(minor: number): Price {
        return new Price(minor);
    }

    export class Price {
        constructor(readonly minor: number) {
            Domain.require(isPrice(minor), 'INVALID_PRODUCT_PRICE');
        }

        changingTo(minor: number): Price {
            return pricedAt(minor);
        }
    }
}
