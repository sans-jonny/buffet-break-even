import {Domain} from '../../../../kernel/domain/Domain';

export class RoomMember {
    readonly id: string;
    readonly nickname: string;
    readonly order: number;
    readonly online: boolean;
    readonly present: boolean;

    constructor(snapshot: RoomMember.Snapshot) {
        Domain.require(!!snapshot.id.trim() && !!snapshot.nickname.trim() && Domain.positive(snapshot.order), 'INVALID_MEMBER');
        this.id = Domain.copy(snapshot.id);
        this.nickname = Domain.copy(snapshot.nickname);
        this.order = Domain.copy(snapshot.order);
        this.online = Domain.copy(snapshot.online);
        this.present = Domain.copy(snapshot.present);
    }

    get snapshot(): RoomMember.Snapshot {
        return Domain.copy({
            id: this.id,
            nickname: this.nickname,
            order: this.order,
            online: this.online,
            present: this.present
        });
    }

    isOnline(): boolean {
        return this.online && this.present;
    }
}

export namespace RoomMember {
    export type Snapshot = Readonly<{
        id: string;
        nickname: string;
        order: number;
        online: boolean;
        present: boolean;
    }>;
}
