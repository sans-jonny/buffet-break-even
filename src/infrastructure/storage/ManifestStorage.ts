import {Domain} from '../../kernel/domain/Domain'
import {Transaction} from '../../kernel/application/Transaction'

export namespace ManifestStorage {
    export interface Adapter {
        get(key: string): string | undefined;

        set(key: string, value: string): void;

        remove(key: string): void;

        keys?(): readonly string[]
    }

    export type Manifest = { parent: string | null; entries: Record<string, { key: string; checksum: string }> }

    export function checksum(value: string): string {
        let hash = 2166136261
        for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619)
        return (hash >>> 0).toString(16) + ':' + value.length
    }

    export class Store {
        private sequence = 0

        constructor(private readonly adapter: Adapter, private readonly id: () => string) {
        }

        read(): Transaction.State {
            const head = this.adapter.get('app:head')
            if (!head) {
                if (this.adapter.get('app:backup-head')) throw new Error('RECOVERY_REQUIRED')
                return {}
            }
            // Never promote an orphan generation or silently roll back personal data.
            return Domain.copy(this.resolve(head).state)
        }

        publish(state: Transaction.State): void {
            const parent = this.adapter.get('app:head') || null
            const previous: {
                state: Transaction.State;
                manifest: Manifest
            } = parent ? this.resolve(parent) : {state: {}, manifest: {parent: null, entries: {}}}
            const generation = `${this.id()}-${++this.sequence}`
            const entries: Manifest['entries'] = {}
            const written: string[] = []
            const verifiedWrite = (key: string, data: string) => {
                this.adapter.set(key, data);
                written.push(key)
                if (this.adapter.get(key) !== data) throw new Error('STORAGE_WRITE_FAILED')
            }
            try {
                Object.entries(state).forEach(([logical, value], index) => {
                    const data = JSON.stringify(value)
                    const old = previous.manifest.entries[logical]
                    if (old && JSON.stringify(previous.state[logical]) === data) entries[logical] = old
                    else {
                        const key = `app:data:${generation}:${index}`
                        verifiedWrite(key, data);
                        entries[logical] = {key, checksum: checksum(data)}
                    }
                })
                const data = JSON.stringify({parent, entries})
                verifiedWrite(`app:manifest:${generation}`, JSON.stringify({data, checksum: checksum(data)}))
                this.resolve(generation)
                if (parent) this.adapter.set('app:backup-head', parent)
                this.adapter.set('app:head', generation)
                if (this.adapter.get('app:head') !== generation) throw new Error('RECOVERY_REQUIRED')
            } catch (error) {
                if (this.adapter.get('app:head') === generation) {
                    // Some adapters can report an error after a successful write. A verified
                    // published generation is committed; reporting failure would invite duplication.
                    try {
                        this.resolve(generation);
                        return
                    } catch {
                        throw new Error('RECOVERY_REQUIRED')
                    }
                }
                // If head write outcome is ambiguous, do not delete potentially committed data.
                if (this.adapter.get('app:head') !== generation) written.forEach(key => {
                    try {
                        this.adapter.remove(key)
                    } catch {
                    }
                })
                throw error
            }
            // Best-effort collection only AFTER publication. Keep the entire previous trusted
            // generation as well as all data referenced by the new manifest (including COW refs).
            try {
                const keep = new Set<string>()
                for (const head of [generation, parent]) {
                    if (!head) continue
                    keep.add(`app:manifest:${head}`)
                    Object.values(this.resolve(head).manifest.entries).forEach(ref => keep.add(ref.key))
                }
                this.adapter.keys?.().filter(key => (key.startsWith('app:data:') || key.startsWith('app:manifest:')) && !keep.has(key))
                    .forEach(key => this.adapter.remove(key))
            } catch { /* Collection failure does not undo an already published head. */
            }
        }

        /** Explicit recovery only; caller must report possible lost local writes. */
        recoverPrevious(): void {
            const backup = this.adapter.get('app:backup-head')
            if (!backup) throw new Error('RECOVERY_REQUIRED')
            this.resolve(backup);
            this.adapter.set('app:head', backup)
        }

        private resolve(head: string): { state: Transaction.State; manifest: Manifest } {
            const envelope = JSON.parse(this.adapter.get(`app:manifest:${head}`) || 'null')
            if (!envelope || checksum(envelope.data) !== envelope.checksum) throw new Error('RECOVERY_REQUIRED')
            const manifest: Manifest = JSON.parse(envelope.data), state: Transaction.State = {}
            if (!manifest.entries || typeof manifest.entries !== 'object') throw new Error('RECOVERY_REQUIRED')
            for (const [logical, ref] of Object.entries(manifest.entries)) {
                const data = this.adapter.get(ref.key)
                if (data === undefined || checksum(data) !== ref.checksum) throw new Error('RECOVERY_REQUIRED')
                state[logical] = JSON.parse(data)
            }
            return {state, manifest}
        }
    }
}
