import {Domain} from '../../../kernel/domain/Domain';
import type {InjectionToken} from '../../../kernel/application/InjectionToken';
import {Dining} from '../dto/Dining';
import {GetRoomUseCase} from '../../../contexts/collaboration/application/port/in/GetRoomUseCase';
import {AuthorizeRoomUseCase} from '../../../contexts/collaboration/application/port/in/AuthorizeRoomUseCase';

/** Constructed in the same transaction scope as the calling Interactor. */
export class DiningAccess {
    static readonly token = Symbol('DiningAccess') as InjectionToken<DiningAccess>;
    constructor(private readonly rooms: GetRoomUseCase, private readonly authorize: AuthorizeRoomUseCase) {}

    requireEditable(session: Dining.Session, actorId: string): Dining.Room | undefined {
        return this.require(session, actorId, false);
    }

    requireHost(session: Dining.Session, actorId: string): Dining.Room | undefined {
        return this.require(session, actorId, true);
    }

    private require(session: Dining.Session, actorId: string, hostOnly: boolean): Dining.Room | undefined {
        if (!session.roomId) return undefined;
        const room = this.rooms.execute(new GetRoomUseCase.Request(session.roomId)).value;
        Domain.require(room && room.activityId === session.activityId, 'ROOM_ACTIVITY_MISMATCH');
        this.authorize.execute(new AuthorizeRoomUseCase.Request(session.roomId, actorId, hostOnly));
        return room;
    }
}
