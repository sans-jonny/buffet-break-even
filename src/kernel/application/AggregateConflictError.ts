export class AggregateConflictError extends Error {
    constructor(readonly aggregateId: string, readonly expectedVersion: number, readonly actualVersion: number) {
        super('AGGREGATE_VERSION_CONFLICT');
        this.name = 'AggregateConflictError';
    }
}
