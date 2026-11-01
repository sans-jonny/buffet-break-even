import type {SerializedEvent} from './SerializedEvent';

export interface CandidateBatch {
    readonly scopeId: string;
    readonly roomId: string | null;
    readonly expectedVersion: number;
    readonly events: readonly SerializedEvent.Fact[];
}
