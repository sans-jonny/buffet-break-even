import {EventCommitter} from '../../kernel/application/EventCommitter';
import {CandidateBatch} from '../../kernel/application/CandidateBatch';
import {CommittedBatch} from '../../kernel/application/CommittedBatch';
import {RoomEventStream} from '../../kernel/application/RoomEventStream';

export class RemoteEventCommitter implements EventCommitter {
    constructor(private readonly stream: RoomEventStream) {
    }

    commit(batch: CandidateBatch): Promise<CommittedBatch> {
        if (!batch.roomId)
            throw new Error('REMOTE_SCOPE_REQUIRED');
        return this.stream.append(batch);
    }
}
