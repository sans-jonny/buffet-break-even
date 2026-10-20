import type {SnapshotDocument} from './schema/SnapshotDocument'
import type {SnapshotPersistence} from './SnapshotPersistence'

/** 单实例缓存、事务暂存和提交后通知。Context Repository 只能映射自己的切片。 */
export class LocalDiningDatabase {
    private committed: SnapshotDocument | undefined
    private staged: SnapshotDocument | undefined
    private changed = false
    private publications = new Map<string, () => void>()

    constructor(private readonly persistence: SnapshotPersistence) {
    }

    read<K extends keyof SnapshotDocument>(key: K): SnapshotDocument[K] {
        return this.copy((this.staged || this.current())[key])
    }

    write<K extends keyof SnapshotDocument>(key: K, value: SnapshotDocument[K]): void {
        const next = this.copy(this.staged || this.current())
        next[key] = this.copy(value)
        if (this.staged) {
            this.staged = next;
            this.changed = true;
            return
        }
        this.persistence.save(this.copy(next))
        this.committed = next
    }

    afterCommit(owner: string, publish: () => void): void {
        if (this.staged) this.publications.set(owner, publish)
        else publish()
    }

    transaction<T>(work: () => T): T {
        if (this.staged) throw new Error('不支持嵌套用餐事务')
        this.staged = this.copy(this.current())
        let result: T
        let notifications: (() => void)[]
        try {
            result = work()
            const next = this.copy(this.staged)
            if (this.changed) {
                this.persistence.save(this.copy(next))
                this.committed = next
            }
            notifications = [...this.publications.values()]
        } finally {
            this.changed = false
            this.staged = undefined
            this.publications.clear()
        }
        for (const publish of notifications!) publish()
        return result!
    }

    private current(): SnapshotDocument {
        if (!this.committed) this.committed = this.copy(this.persistence.load())
        return this.committed
    }

    private copy<T>(value: T): T {
        return JSON.parse(JSON.stringify(value))
    }
}
