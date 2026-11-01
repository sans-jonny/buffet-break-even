import {Domain} from '../domain/Domain';
import type {DomainEvent} from '../domain/DomainEvent';

/** Wire schema belongs to the adapter; payload contains only identity, version and business facts. */
export namespace SerializedEvent {
    export type Fact<T = unknown> = Readonly<{
        type: string;
        schemaVersion: number;
        key: string;
        payload: T;
    }>;

    export function fact(event: DomainEvent, key: string): Fact {
        return Domain.copy({
            type: event.type, schemaVersion: 3, key,
            payload: {aggregateId: event.aggregateId, expectedVersion: event.expectedVersion, facts: event.facts}
        });
    }

    export function decode<E extends DomainEvent>(event: Fact): E {
        const payload = event.payload as E;
        Domain.require(payload && typeof payload.aggregateId === 'string' && !!payload.aggregateId.trim()
            && Number.isSafeInteger(payload.expectedVersion) && payload.expectedVersion >= 0
            && payload.facts && typeof payload.facts === 'object' && !Array.isArray(payload.facts)
            && !('snapshot' in payload), 'INVALID_EVENT_PAYLOAD');
        return {...Domain.copy(payload), type: event.type} as E;
    }
}
