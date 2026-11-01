/** Transport only. Payload remains opaque to the relay. */
export namespace EventBatch {
    export type Event = Readonly<{ type: string; schemaVersion: number; key: string; payload: unknown; streamVersion?: number }>
    export type Candidate = Readonly<{
        scopeId: string;
        roomId: string | null;
        expectedVersion: number;
        events: readonly Event[]
    }>
    export type Committed = Readonly<{
        scopeId: string;
        roomId: string | null;
        batchId: string;
        previousVersion: number;
        fromVersion: number;
        toVersion: number;
        events: readonly (Event & { version: number; streamVersion: number; batchIndex: number; batchSize: number; batchId: string })[]
    }>

    export function validate(events: readonly Event[]): void {
        if (!Array.isArray(events) || !events.length || events.length > 512) throw new Error('BAD_EVENT_ENVELOPE')
        for (const event of events) {
            if (!event || typeof event.type !== 'string' || !/^[A-Za-z][A-Za-z0-9.]{0,95}$/.test(event.type)
                || !Number.isSafeInteger(event.schemaVersion) || event.schemaVersion < 1 || typeof event.key !== 'string' || !event.key.length || event.key.length > 512 || event.payload === undefined) throw new Error('BAD_EVENT_ENVELOPE')
        }
        const encoded = JSON.stringify(events, (_key, value) => {
            if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint'
                || (typeof value === 'number' && !Number.isFinite(value))) throw new Error('BAD_EVENT_ENVELOPE')
            return value
        })
        if (encoded.length > 500000) throw new Error('SIZE_LIMIT')
    }

    export function commit(candidate: Candidate, batchId: string): Committed {
        validate(candidate.events)
        if (!Number.isSafeInteger(candidate.expectedVersion) || candidate.expectedVersion < 0 || !Number.isSafeInteger(candidate.expectedVersion + candidate.events.length)) throw new Error('INVALID_VERSION')
        candidate.events.forEach((event, index) => {
            if (event.streamVersion !== undefined && event.streamVersion !== candidate.expectedVersion + index + 1) throw new Error('INVALID_STREAM_VERSION')
        })
        return {
            scopeId: candidate.scopeId, roomId: candidate.roomId, batchId, previousVersion: candidate.expectedVersion,
            fromVersion: candidate.expectedVersion + 1, toVersion: candidate.expectedVersion + candidate.events.length,
            events: candidate.events.map((event, index) => ({
                ...event,
                version: candidate.expectedVersion + index + 1,
                streamVersion: candidate.expectedVersion + index + 1,
                batchId,
                batchIndex: index,
                batchSize: candidate.events.length
            }))
        }
    }

    export function complete(batch: Committed): void {
        validate(batch.events)
        if (typeof batch.batchId !== 'string' || !batch.batchId || typeof batch.scopeId !== 'string' || !batch.scopeId || (batch.roomId !== null && batch.roomId !== batch.scopeId)
            || !Number.isSafeInteger(batch.previousVersion) || batch.previousVersion < 0
            || !Number.isSafeInteger(batch.toVersion)
            || batch.fromVersion !== batch.previousVersion + 1 || batch.toVersion !== batch.previousVersion + batch.events.length
            || batch.events.some((event,
                                  index) => event.version !== batch.fromVersion + index || event.streamVersion !== event.version || event.batchIndex !== index || event.batchSize !== batch.events.length || event.batchId !== batch.batchId)) throw new Error('INCOMPLETE_BATCH')
    }
}
