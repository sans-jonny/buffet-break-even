import type {SerializedEvent} from './SerializedEvent';

export interface CommittedBatch {
    readonly scopeId: string;
    readonly roomId: string | null;
    readonly batchId: string;
    readonly previousVersion: number;
    readonly fromVersion: number;
    readonly toVersion: number;
    readonly events: readonly (SerializedEvent.Fact & {
        readonly version: number;
        readonly streamVersion: number;
        readonly batchIndex: number;
        readonly batchSize: number;
        readonly batchId: string;
    })[];
}
