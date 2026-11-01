import {Domain} from '../../../../kernel/domain/Domain';

/** Accounting money supports signed net results, but a ticket total must be positive. */
export namespace Money {
    export const isTicket = (minor: number): boolean => Domain.positive(minor);

    export function ofMinor(minor: number): Amount {
        Domain.require(Number.isSafeInteger(minor), 'MONEY_OVERFLOW');
        return new Amount(minor);
    }

    export class Amount {
        constructor(readonly minor: number) {
            Domain.require(Number.isSafeInteger(minor), 'MONEY_OVERFLOW');
        }

        plus(other: Amount): Amount {
            return ofMinor(this.minor + other.minor);
        }

        minus(other: Amount): Amount {
            return ofMinor(this.minor - other.minor);
        }

        times(quantity: number): Amount {
            Domain.require(Domain.minor(quantity), 'INVALID_QUANTITY');
            return ofMinor(this.minor * quantity);
        }

        comparedWith(other: Amount): number {
            return Math.sign(this.minor - other.minor);
        }
    }
}
