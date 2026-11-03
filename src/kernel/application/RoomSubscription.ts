import type {CommittedBatch} from './CommittedBatch';

export interface RoomSubscription {
    subscribe(roomId: string, onBatch: (batch?: CommittedBatch) => void,
              onError: (error: Error) => void): Promise<() => void>;
}
