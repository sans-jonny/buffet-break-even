import type {BuffetReader} from '../../application/port/out/BuffetReader'
import type {BuffetWriter} from '../../application/port/out/BuffetWriter'
import type {BuffetSnapshot} from '../../domain/BuffetSnapshot'

/** 每个应用实例独立缓存；仅在持久化成功后替换缓存，并隔离读写引用。 */
export class CachedBuffetRepository implements BuffetReader, BuffetWriter {
    private snapshot: BuffetSnapshot | undefined

    constructor(private readonly persistence: BuffetReader & BuffetWriter) {
    }

    load(): BuffetSnapshot {
        if (!this.snapshot) this.snapshot = this.copy(this.persistence.load())
        return this.copy(this.snapshot)
    }

    save(snapshot: BuffetSnapshot): void {
        const next = this.copy(snapshot)
        this.persistence.save(this.copy(next))
        this.snapshot = next
    }

    private copy(snapshot: BuffetSnapshot): BuffetSnapshot {
        return JSON.parse(JSON.stringify(snapshot))
    }
}
