import type {SnapshotDocument} from './SnapshotDocument'

export interface SnapshotPersistence {
    load(): SnapshotDocument;

    save(snapshot: SnapshotDocument): void
}
