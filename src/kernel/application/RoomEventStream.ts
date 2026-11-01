import type {CandidateBatch} from './CandidateBatch';
import type {CommittedBatch} from './CommittedBatch';

export interface RoomEventStream {
    append(batch: CandidateBatch): Promise<CommittedBatch>;

    read(roomId: string, afterVersion: number): Promise<{
        batches: CommittedBatch[];
        latestVersion: number;
        hasMore: boolean;
    }>;
}
