import {AggregateRoot} from '../../../../kernel/domain/AggregateRoot';
import {Domain} from '../../../../kernel/domain/Domain';
import {RoomMember} from '../entity/RoomMember';
import {DiningRoomRejected} from '../rejection/DiningRoomRejected';
import {RoomOpened} from '../event/RoomOpened';
import {MemberJoined} from '../event/MemberJoined';
import {MemberRejoined} from '../event/MemberRejoined';
import {MemberLeft} from '../event/MemberLeft';
import {MemberObservedOffline} from '../event/MemberObservedOffline';
import {HostTransferred} from '../event/HostTransferred';
import {MemberNicknameChanged} from '../event/MemberNicknameChanged';
import {RoomEnded} from '../event/RoomEnded';
import {RoomAbandoned} from '../event/RoomAbandoned';

export class DiningRoom extends AggregateRoot<DiningRoom.State> {
    readonly code: string;
    readonly activityId: string;
    readonly creatorId: string;
    readonly hostId: string | null;
    readonly status: 'ACTIVE' | 'ENDED' | 'ABANDONED';
    readonly members: readonly DiningRoom.Member[];
    readonly privateSourceIds: readonly string[];
    readonly eligibleIds: readonly string[];
    readonly nextOrder: number;
    readonly emptySince: string | null;

    private constructor(state: DiningRoom.State) {
        super(state.id, state.version);
        this.code = Domain.copy(state.code);
        this.activityId = Domain.copy(state.activityId);
        this.creatorId = Domain.copy(state.creatorId);
        this.hostId = Domain.copy(state.hostId);
        this.status = Domain.copy(state.status);
        this.members = Domain.copy(state.members);
        this.privateSourceIds = Domain.copy(state.privateSourceIds);
        this.eligibleIds = Domain.copy(state.eligibleIds);
        this.nextOrder = Domain.copy(state.nextOrder);
        this.emptySince = Domain.copy(state.emptySince);
    }

    static create(id: string,
                  code: string,
                  activityId: string,
                  creatorId: string,
                  displayName: string,
                  privateSourceIds: readonly string[]): RoomOpened {
        Domain.require(!!id.trim() && /^\d{6}$/.test(code) && !!activityId.trim() && !!creatorId.trim() && !!displayName.trim(), 'INVALID_ROOM');
        return new RoomOpened(id, 0, {code, activityId, creatorId, nickname: displayName, privateSourceIds});
    }

    static reconstitute(state: DiningRoom.State): DiningRoom {
        state.members.forEach(m => new RoomMember(m));
        const online = state.members.filter(m => new RoomMember(m).isOnline());
        Domain.require(!online.length ? state.hostId === null : online.some(m => m.id === state.hostId), 'INVALID_HOST_SNAPSHOT');
        return new DiningRoom(state);
    }

    snapshot(): DiningRoom.State {
        return Domain.copy({
            id: this.id,
            version: this.version,
            code: this.code,
            activityId: this.activityId,
            creatorId: this.creatorId,
            hostId: this.hostId,
            status: this.status,
            members: this.members,
            privateSourceIds: this.privateSourceIds,
            eligibleIds: this.eligibleIds,
            nextOrder: this.nextOrder,
            emptySince: this.emptySince
        });
    }

    authorize(memberId: string, hostOnly = false): void {
        Domain.require(this.status === 'ACTIVE', 'ALREADY_ENDED');
        Domain.require(this.members.some(m => m.id === memberId && m.present && m.online), 'ONLINE_MEMBER_REQUIRED');
        Domain.require(!hostOnly || this.hostId === memberId, 'HOST_REQUIRED');
    }

    join(memberId: string, displayName: string, joinedAt: string): MemberJoined | MemberRejoined | DiningRoomRejected {
        const member = {id: memberId, nickname: displayName};
        Domain.require(!!memberId.trim() && !!displayName.trim() && !Number.isNaN(Date.parse(joinedAt)), 'INVALID_MEMBER');
        if (this.status === 'ABANDONED')
            return new DiningRoomRejected('ROOM_ABANDONED');
        if (this.status === 'ENDED')
            return this.eligibleIds.includes(member.id)
                ? new MemberRejoined(this.id, this.version, {memberId}) : new DiningRoomRejected('NOT_ELIGIBLE');
        const previous = this.members.find(m => m.id === member.id);
        if (previous?.present && previous.online)
            return new DiningRoomRejected('ALREADY_JOINED');
        return new MemberJoined(this.id, this.version, {
            member: {...member, order: this.nextOrder, online: true, present: true},
            nextOrder: this.nextOrder + 1, hostId: this.hostId || member.id
        });
    }

    leave(memberId: string, date: string, offline = false): MemberLeft | MemberObservedOffline | DiningRoomRejected {
        if (!this.members.some(m => m.id === memberId && m.present))
            return new DiningRoomRejected('MEMBER_NOT_FOUND');
        const members = this.members.map(m => m.id === memberId ? {...m, online: false, present: offline} : m);
        const online = members.filter(m => m.present && m.online).sort((a, b) => a.order - b.order);
        const hostId = online.some(m => m.id === this.hostId) ? this.hostId : online[0]?.id || null;
        return new (offline ? MemberObservedOffline : MemberLeft)(this.id, this.version, {
            memberId, hostId, emptySince: online.length ? null : date
        });
    }

    changeNickname(memberId: string, nickname: string): MemberNicknameChanged {
        this.authorize(memberId);
        Domain.require(!!nickname.trim() && nickname.trim().length <= 24, 'INVALID_NICKNAME');
        return new MemberNicknameChanged(this.id, this.version, {memberId, nickname: nickname.trim()});
    }

    transferHost(actor: string, target: string): HostTransferred | DiningRoomRejected {
        this.authorize(actor, true);
        if (target === actor || !this.members.some(m => m.id === target && m.online && m.present))
            return new DiningRoomRejected('ONLINE_SUCCESSOR_REQUIRED');
        return new HostTransferred(this.id, this.version, {hostId: target});
    }

    end(actor: string, abandoned = false): RoomEnded | RoomAbandoned | DiningRoomRejected {
        this.authorize(actor, true);
        return abandoned ? new RoomAbandoned(this.id, this.version) : new RoomEnded(this.id, this.version, {eligibleIds: this.members.filter(m => m.present && m.online).map(m => m.id)});
    }

    authorizeCatalogSync(actor: string, sourceId: string): void {
        this.authorize(actor);
        Domain.require(actor === this.creatorId && this.privateSourceIds.includes(sourceId), 'CREATOR_SOURCE_REQUIRED');
    }
}

export namespace DiningRoom {
    export type Member = Readonly<{
        id: string;
        nickname: string;
        order: number;
        online: boolean;
        present: boolean;
    }>;
    export type State = Readonly<{
        id: string;
        code: string;
        activityId: string;
        creatorId: string;
        hostId: string | null;
        version: number;
        status: 'ACTIVE' | 'ENDED' | 'ABANDONED';
        members: readonly Member[];
        privateSourceIds: readonly string[];
        eligibleIds: readonly string[];
        nextOrder: number;
        emptySince: string | null;
    }>;
    export type Event =
        RoomOpened
        | MemberJoined
        | MemberRejoined
        | MemberLeft
        | MemberObservedOffline
        | HostTransferred
        | MemberNicknameChanged
        | RoomEnded
        | RoomAbandoned;
}
