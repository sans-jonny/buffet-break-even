import type {SnapshotDocument} from './schema/SnapshotDocument'

export interface SnapshotPersistence {
    load(): SnapshotDocument;

    save(snapshot: SnapshotDocument): void
}
