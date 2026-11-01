import type {CandidateBatch} from './CandidateBatch';
import type {CommittedBatch} from './CommittedBatch';

export interface EventCommitter {
    commit(batch: CandidateBatch): Promise<CommittedBatch>;
}
