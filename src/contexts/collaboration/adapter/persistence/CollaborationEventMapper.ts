import {PersistedRecord} from '../../../../infrastructure/storage/PersistedRecord';
import {Domain} from '../../../../kernel/domain/Domain';
import {AggregateConflictError} from '../../../../kernel/application/AggregateConflictError';
import {Transaction} from '../../../../kernel/application/Transaction';
import {SerializedEvent} from '../../../../kernel/application/SerializedEvent';
import {DiningRoom} from '../../domain/aggregate/DiningRoom';

export class CollaborationEventMapper {
    static readonly types = ['RoomOpened', 'MemberJoined', 'MemberRejoined', 'MemberLeft', 'MemberObservedOffline', 'HostTransferred', 'RoomEnded', 'RoomAbandoned'];

    static apply(event: SerializedEvent.Fact, state: Transaction.State): void {
        const e = SerializedEvent.decode<DiningRoom.Event>(event),
            before = state[event.key] as DiningRoom.State | undefined;
        if (e.expectedVersion !== (before?.version || 0))
            throw new AggregateConflictError(e.aggregateId, e.expectedVersion, before?.version || 0);
        Domain.require(event.key === 'collaboration/room/' + e.aggregateId, 'INVALID_EVENT_TARGET');
        Domain.require(before || e.type === 'RoomOpened', 'AGGREGATE_NOT_FOUND');
        if (e.type === 'RoomOpened') {
            state[event.key] = DiningRoom.reconstitute({
                id: e.aggregateId,
                version: e.expectedVersion + 1,
                code: e.facts.code,
                activityId: e.facts.activityId,
                creatorId: e.facts.creatorId,
                hostId: e.facts.creatorId,
                status: 'ACTIVE',
                nextOrder: 2,
                emptySince: null,
                privateSourceIds: e.facts.privateSourceIds,
                eligibleIds: [],
                members: [{id: e.facts.creatorId, nickname: e.facts.nickname, order: 1, online: true, present: true}]
            }).snapshot();
            return;
        }
        Domain.require(before, 'AGGREGATE_NOT_FOUND');
        const next = PersistedRecord.copy(before);
        switch (e.type) {
            case 'MemberJoined':
                next.members = [...next.members.filter(m => m.id !== e.facts.member.id), PersistedRecord.copy(e.facts.member)];
                next.hostId = e.facts.hostId;
                next.nextOrder = e.facts.nextOrder;
                next.emptySince = null;
                break;
            case 'MemberRejoined':
                break; // Acknowledges frozen entitlement; the closed room membership remains unchanged.
            case 'MemberLeft':
            case 'MemberObservedOffline':
                next.members = next.members.map(m => m.id === e.facts.memberId ? {
                    ...m,
                    online: false,
                    present: e.type === 'MemberObservedOffline'
                } : m);
                next.hostId = e.facts.hostId;
                next.emptySince = e.facts.emptySince;
                break;
            case 'HostTransferred':
                next.hostId = e.facts.hostId;
                break;
            case 'RoomEnded':
                next.status = 'ENDED';
                next.eligibleIds = [...e.facts.eligibleIds];
                break;
            case 'RoomAbandoned':
                next.status = 'ABANDONED';
                next.eligibleIds = [];
                break;
        }
        next.version = e.expectedVersion + 1;
        state[event.key] = DiningRoom.reconstitute(next).snapshot();
    }
}
