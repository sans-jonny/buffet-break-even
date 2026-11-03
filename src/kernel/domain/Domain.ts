/** Shared event mechanics only; business vocabulary stays in its context. */
export namespace Domain {
    export class Violation extends Error {
        constructor(readonly code: string) {
            super(code);
            this.name = 'BusinessRuleError';
        }
    }

    export type Rejected = Readonly<{
        rejected: string;
    }>;

    export function require(condition: unknown, code: string): asserts condition {
        if (!condition)
            throw new Violation(code);
    }

    export function copy<T>(value: T): T {
        return value === undefined ? value : JSON.parse(JSON.stringify(value));
    }

    export function freeze<T>(value: T): T {
        if (value && typeof value === 'object') {
            Object.values(value).forEach(freeze);
            Object.freeze(value);
        }
        return value;
    }

    export function accepted<T>(decision: T | Rejected): T {
        if (decision && typeof decision === 'object' && 'rejected' in decision)
            throw new Violation(String(decision.rejected));
        return decision as T;
    }

    export function positive(value: number): boolean {
        return Number.isSafeInteger(value) && value > 0;
    }

    export function minor(value: number): boolean {
        return Number.isSafeInteger(value) && value >= 0;
    }
}
