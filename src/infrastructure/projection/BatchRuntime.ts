import {StreamConflictError} from '../../kernel/application/StreamConflictError';
import {LocalEventCommitter} from '../event-commit/LocalEventCommitter';
import {RemoteEventCommitter} from '../event-commit/RemoteEventCommitter';
import type {CommittedBatchProjector} from '../../kernel/application/CommittedBatchProjector';
import type {RoomSynchronizer} from '../../kernel/application/RoomSynchronizer';
import type {RoomEventStream} from '../../kernel/application/RoomEventStream';
import {SerializedEvent} from '../../kernel/application/SerializedEvent';
import {Domain} from '../../kernel/domain/Domain';
import {Transaction} from '../../kernel/application/Transaction';
import {EventBatch} from '../../../protocol/EventBatch';
import type {RoomRestaurantPersistence} from '../storage/RoomRestaurantPersistence';
import {ManifestStorage} from '../storage/ManifestStorage';

export namespace BatchRuntime {
    export type Projector = (event: SerializedEvent.Fact, state: Transaction.State) => void;
    export type Handler = (event: SerializedEvent.Fact, tx: Transaction.Context) => Promise<void>;
    export type Remote = RoomEventStream & Partial<RoomRestaurantPersistence.Remote>;

    export class Runtime implements Transaction.Runner, CommittedBatchProjector, RoomSynchronizer {
        readonly sync = new Map<string, 'READY' | 'CATCHING_UP' | 'UNKNOWN' | 'SYNC_PENDING' | 'BLOCKED'>();
        private readonly localCommitter: LocalEventCommitter;
        private readonly remoteCommitter?: RemoteEventCommitter;
        private readonly activeContexts = new WeakMap<Transaction.Context, {
            scopeId: string;
            roomId: string | null;
        }>();
        private roomBaseline?: (roomId: string, state: Transaction.State) => Promise<void>;
        private queue: Promise<unknown> = Promise.resolve();
        private readonly listeners = new Set<(event: Transaction.Invalidation) => void>();
        private readonly handlers = new Map<string, Handler[]>();
        private readonly projectors = new Map<string, Projector>();
        private readonly committedHandlers = new Map<string, ((event: SerializedEvent.Fact,
                                                               state: Transaction.State) => Promise<void>)[]>();

        constructor(private readonly storage: ManifestStorage.Store,
                    private readonly id: () => string,
                    private readonly remote?: Remote) {
            this.localCommitter = new LocalEventCommitter(id);
            this.remoteCommitter = remote ? new RemoteEventCommitter(remote) : undefined;
        }

        registerRoomBaseline(load: (roomId: string, state: Transaction.State) => Promise<void>): void {
            this.roomBaseline = load;
        }

        register(types: readonly string[], projector: Projector): void {
            types.forEach(type => this.projectors.set(type, projector));
        }

        on(type: string, handler: Handler): void {
            this.handlers.set(type, [...(this.handlers.get(type) || []), handler]);
        }

        onCommitted(type: string,
                    handler: (event: SerializedEvent.Fact, state: Transaction.State) => Promise<void>): void {
            this.committedHandlers.set(type, [...(this.committedHandlers.get(type) || []), handler]);
        }

        subscribe(listener: (event: Transaction.Invalidation) => void): () => void {
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        }

        get<T>(key: string): T | undefined {
            return this.storage.read()[key] as T | undefined;
        }

        entries<T>(prefix: string): T[] {
            return Object.entries(this.storage.read()).filter(([key]) => key.startsWith(prefix)).map(([, value]) => value as T);
        }

        local(work: (state: Transaction.State) => void | Promise<void>): Promise<void> {
            return this.serial(async () => {
                const state = this.storage.read();
                await work(state);
                this.storage.publish(state);
                this.notify();
            });
        }

        projectCommitted(batch: EventBatch.Committed): Promise<void> {
            return this.serial(async () => {
                const state = this.storage.read();
                if (await this.apply(batch, state)) {
                    this.storage.publish(state);
                    this.notify(batch.events.map(event => event.key));
                }
            });
        }

        synchronize(roomId: string): Promise<void> {
            return this.serial(async () => {
                const knownCommitted = this.sync.get(roomId) === 'SYNC_PENDING';
                const unknown = !knownCommitted && (this.sync.get(roomId) === 'UNKNOWN' || !!this.get(`outcome/${roomId}`));
                try {
                    await this.catchUp(roomId);
                    if (knownCommitted) {
                        const state = this.storage.read();
                        delete state[`outcome/${roomId}`];
                        this.storage.publish(state);
                    }
                } finally {
                    if (unknown)
                        this.sync.set(roomId, 'UNKNOWN');
                }
            });
        }

        rebuild(roomId: string): Promise<void> {
            return this.serial(async () => {
                if (!this.remote)
                    throw new Error('REMOTE_NOT_CONFIGURED');
                const state = this.storage.read(), room = state[`collaboration/room/${roomId}`] as {
                    activityId: string;
                } | undefined;
                Object.keys(state).filter(key => key === `cursor/${roomId}` || key === `collaboration/room/${roomId}`
                    || key.startsWith(`journal/${roomId}/`) || key.startsWith(`catalog/${roomId}/`)
                    || (room && (key === `accounting/activity/${room.activityId}` || key.startsWith(`accounting/consumption/${room.activityId}/`))))
                    .forEach(key => delete state[key]);
                let afterVersion = 0;
                for (; ;) {
                    const page = await this.remote.read(roomId, afterVersion);
                    for (const batch of page.batches) {
                        if (batch.roomId !== roomId)
                            throw new Error('WRONG_STREAM');
                        await this.apply(batch, state);
                    }
                    const next = Number(state[`cursor/${roomId}`] || 0);
                    if (!page.hasMore && next >= page.latestVersion)
                        break;
                    if (next === afterVersion)
                        throw new Error('EVENT_GAP');
                    afterVersion = next;
                }
                this.storage.publish(state);
                this.notify();
                if (this.sync.get(roomId) !== 'UNKNOWN')
                    this.sync.set(roomId, 'READY');
            });
        }

        run<T>(scopeId: string, roomId: string | null, work: (tx: Transaction.Context) => Promise<T>): Promise<T> {
            return this.serial(async () => {
                Domain.require(!roomId || roomId === scopeId, 'WRONG_STREAM');
                if (roomId && (this.sync.get(roomId) === 'UNKNOWN' || this.get(`outcome/${roomId}`)))
                    throw new Error('UNKNOWN_COMMIT_OUTCOME');
                for (let attempt = 0; attempt < 3; attempt++) {
                    if (roomId)
                        await this.catchUp(roomId);
                    const base = this.storage.read(), prepared = this.prepare(Domain.copy(base), scopeId, roomId);
                    this.activeContexts.set(prepared.tx, {scopeId, roomId});
                    let response: T;
                    try {
                        response = await work(prepared.tx);
                        prepared.assertHealthy();
                    } finally {
                        this.activeContexts.delete(prepared.tx);
                        prepared.seal();
                    }
                    const candidate = Domain.freeze({
                        scopeId,
                        roomId,
                        expectedVersion: Number(base[`cursor/${scopeId}`] || 0),
                        events: prepared.events.map((event, index) => ({
                            ...event,
                            streamVersion: Number(base[`cursor/${scopeId}`] || 0) + index + 1
                        }))
                    });
                    if (!candidate.events.length)
                        return response;
                    EventBatch.validate(candidate.events);
                    let committed: EventBatch.Committed;
                    if (!roomId)
                        committed = await this.localCommitter.commit(candidate);
                    else {
                        // Persist uncertainty BEFORE sending: a process crash cannot make a non-idempotent
                        // request look safe to resend. This marker is technical, not a business projection.
                        this.storage.publish({...base, [`outcome/${roomId}`]: 'UNKNOWN'});
                        try {
                            committed = await this.remoteCommitter!.commit(candidate);
                        } catch (error) {
                            if ((error as Error).message === 'VERSION_CONFLICT' || (error as Error).message.startsWith('REJECTED_')) {
                                this.storage.publish(base);
                                if ((error as Error).message === 'VERSION_CONFLICT') {
                                    if (error instanceof StreamConflictError && error.recovery.batches?.length) {
                                        const recovered = this.storage.read();
                                        for (const batch of error.recovery.batches) {
                                            if (batch.scopeId !== roomId || batch.roomId !== roomId)
                                                throw new Error('WRONG_STREAM');
                                            await this.apply(batch, recovered);
                                        }
                                        this.storage.publish(recovered);
                                        this.notify();
                                    }
                                    if (attempt < 2)
                                        continue;
                                }
                                throw error;
                            }
                            this.sync.set(roomId, 'UNKNOWN');
                            throw new Error('UNKNOWN_COMMIT_OUTCOME');
                        }
                    }
                    try {
                        if (committed.scopeId !== scopeId || committed.roomId !== roomId || committed.previousVersion !== candidate.expectedVersion)
                            throw new Error('WRONG_STREAM');
                        await this.apply(committed, base);
                        this.storage.publish(base);
                    } catch (error) {
                        if (roomId) {
                            this.sync.set(roomId, 'SYNC_PENDING');
                            throw new Error('SYNC_PENDING');
                        }
                        throw error;
                    }
                    this.notify(committed.events.map(event => event.key));
                    if (roomId)
                        this.sync.set(roomId, 'READY');
                    return response;
                }
                throw new Error('VERSION_CONFLICT');
            });
        }

        assertActive(tx: Transaction.Context, scopeId: string, roomId: string | null): void {
            const scope = this.activeContexts.get(tx);
            Domain.require(scope && scope.scopeId === scopeId && scope.roomId === roomId, 'INVALID_TRANSACTION_CONTEXT');
        }

        /** User must acknowledge ambiguity; catch-up alone cannot prove request identity. */
        acknowledgeUnknown(roomId: string): Promise<void> {
            return this.serial(async () => {
                await this.catchUp(roomId);
                const state = this.storage.read();
                delete state[`outcome/${roomId}`];
                this.storage.publish(state);
                this.sync.set(roomId, 'READY');
                this.notify();
            });
        }

        private notify(keys: readonly string[] = []): void {
            const invalidation = Domain.freeze({type: 'DataInvalidationEvent' as const, keys: [...new Set(keys)]});
            this.listeners.forEach(listener => {
                try {
                    listener(invalidation);
                } catch (error) {
                    console.error('失效通知失败', error);
                }
            });
        }

        private serial<T>(work: () => Promise<T>): Promise<T> {
            const result = this.queue.then(work);
            this.queue = result.catch(() => {
            });
            return result;
        }

        private project(event: SerializedEvent.Fact, state: Transaction.State): void {
            if (event.schemaVersion !== 3 || !this.projectors.has(event.type))
                throw new Error('BLOCKED_UNKNOWN_EVENT');
            this.projectors.get(event.type)!(event, state);
        }

        private prepare(state: Transaction.State, scopeId: string, roomId: string | null): {
            tx: Transaction.Context;
            events: SerializedEvent.Fact[];
            assertHealthy: () => void;
            seal: () => void;
        } {
            const events: SerializedEvent.Fact[] = [];
            let sealed = false, depth = 0, failed = false, failure: unknown;
            const tx: Transaction.Context = {
                phase: 'PREPARE', scopeId, roomId,
                get: <T>(key: string) => Domain.copy(state[key] ?? null) as T | undefined,
                entries: <T>(prefix: string) => Object.entries(state).filter(([key]) => key.startsWith(prefix)).map(([, value]) => Domain.copy(value) as T),
                stage: async (decision) => {
                    try {
                        Domain.require(!sealed, 'BATCH_SEALED');
                        if (failed)
                            throw failure;
                        Domain.require(events.length < 512 && depth < 64, 'EVENT_CYCLE_LIMIT');
                        const event = Domain.accepted(decision);
                        const frozen = Domain.freeze(Domain.copy(event));
                        this.project(frozen, state);
                        events.push(frozen);
                        depth++;
                        try {
                            for (const handler of this.handlers.get(event.type) || [])
                                await handler(frozen, tx);
                        } finally {
                            depth--;
                        }
                    } catch (error) {
                        failed = true;
                        failure = error;
                        throw error;
                    }
                }
            };
            return {
                tx, events, assertHealthy: () => {
                    if (failed)
                        throw failure;
                }, seal: () => {
                    sealed = true;
                    Object.freeze(events);
                }
            };
        }

        private async apply(batch: EventBatch.Committed, state: Transaction.State): Promise<boolean> {
            EventBatch.complete(batch);
            const cursor = Number(state[`cursor/${batch.scopeId}`] || 0);
            if (batch.toVersion <= cursor)
                return false;
            if (cursor !== batch.previousVersion)
                throw new Error(cursor > batch.previousVersion ? 'RECOVERY_REQUIRED' : 'EVENT_GAP');
            if (batch.roomId) await this.roomBaseline?.(batch.roomId, state);
            state[`cursor/${batch.scopeId}`] = batch.toVersion;
            for (const event of batch.events) {
                this.project(event, state);
                for (const handler of this.committedHandlers.get(event.type) || [])
                    await handler(event, state);
            }
            state[`cursor/${batch.scopeId}`] = batch.toVersion;
            state[`journal/${batch.scopeId}/${batch.fromVersion}`] = Domain.copy(batch);
            return true;
        }

        private async catchUp(roomId: string): Promise<void> {
            if (!this.remote)
                throw new Error('REMOTE_NOT_CONFIGURED');
            this.sync.set(roomId, 'CATCHING_UP');
            try {
                // Isolated catch-up: UI sees the previous complete projection until publication.
                const state = this.storage.read();
                let changed = false;
                for (; ;) {
                    const cursor = Number(state[`cursor/${roomId}`] || 0);
                    const page = await this.remote.read(roomId, cursor);
                    for (const batch of page.batches) {
                        if (batch.roomId !== roomId || batch.scopeId !== roomId)
                            throw new Error('WRONG_STREAM');
                        changed = await this.apply(batch, state) || changed;
                    }
                    if (!page.hasMore && Number(state[`cursor/${roomId}`] || 0) >= page.latestVersion)
                        break;
                    if (Number(state[`cursor/${roomId}`] || 0) === cursor)
                        throw new Error('EVENT_GAP');
                }
                if (changed) {
                    this.storage.publish(state);
                    this.notify();
                }
                this.sync.set(roomId, 'READY');
            } catch (error) {
                this.sync.set(roomId, 'BLOCKED');
                throw error;
            }
        }
    }
}
