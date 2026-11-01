import type {CommittedBatch} from './CommittedBatch';

export interface CommittedBatchProjector {
    projectCommitted(batch: CommittedBatch): Promise<void>;
}
