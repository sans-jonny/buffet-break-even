import type {CommittedBatch} from './CommittedBatch';

/** Transport-level CAS conflict includes complete missing batches, never rejected local facts. */
export class StreamConflictError extends Error {
    constructor(readonly recovery: StreamConflictError.Recovery) {
        super('VERSION_CONFLICT');
    }
}

export namespace StreamConflictError {
    export type Recovery = Readonly<{
        batches?: readonly CommittedBatch[];
        latestVersion?: number;
        hasMore?: boolean;
    }>;
}
