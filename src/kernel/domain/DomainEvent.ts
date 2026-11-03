import {Domain} from './Domain';

/** A determined business change, addressed to one aggregate at an expected version. */
export abstract class DomainEvent<F extends object = object> {
    abstract readonly type: string;
    readonly facts: Readonly<F>;

    protected constructor(readonly aggregateId: string, readonly expectedVersion: number, facts: F) {
        Domain.require(!!aggregateId.trim() && Number.isSafeInteger(expectedVersion) && expectedVersion >= 0, 'INVALID_EVENT_IDENTITY');
        this.facts = Domain.copy(facts);
    }

    get aggregateVersion(): number {
        return this.expectedVersion + 1;
    }
}
