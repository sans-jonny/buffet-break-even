import {EventCommitter} from '../../kernel/application/EventCommitter';
import {CandidateBatch} from '../../kernel/application/CandidateBatch';
import {CommittedBatch} from '../../kernel/application/CommittedBatch';
import {EventBatch} from '../../../protocol/EventBatch';

/** Allocation is provisional until the runtime publishes log and projection together. */
export class LocalEventCommitter implements EventCommitter {
    constructor(private readonly id: () => string) {
    }

    async commit(batch: CandidateBatch): Promise<CommittedBatch> {
        return EventBatch.commit(batch, this.id());
    }
}
