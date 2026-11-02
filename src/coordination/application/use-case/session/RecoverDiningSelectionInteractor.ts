import {Domain} from '../../../../kernel/domain/Domain';
import {RecoverDiningSelectionUseCase} from '../../port/in/session/RecoverDiningSelectionUseCase';
import {GetPersonalDiningUseCase} from '../../port/in/device/GetPersonalDiningUseCase';
import {SelectDiningSessionUseCase} from '../../port/in/device/SelectDiningSessionUseCase';
import {GetDiningActivityUseCase} from '../../../../contexts/accounting/application/port/in/GetDiningActivityUseCase';
import {GetRoomUseCase} from '../../../../contexts/collaboration/application/port/in/GetRoomUseCase';
import type {RoomConnection} from '../../port/out/session/RoomConnection';

export class RecoverDiningSelectionInteractor implements RecoverDiningSelectionUseCase {
    constructor(private readonly personal: GetPersonalDiningUseCase, private readonly activities: GetDiningActivityUseCase,
                private readonly rooms: GetRoomUseCase, private readonly select: SelectDiningSessionUseCase,
                private readonly connection: RoomConnection) {}
    async execute(request: RecoverDiningSelectionUseCase.Request): Promise<RecoverDiningSelectionUseCase.Response> {
        const session = request.session;
        const identity = this.personal.execute().identity;
        Domain.require(identity, 'IDENTITY_REQUIRED');
        if (session.roomId) await this.connection.watch(session.roomId);
        const activity = this.activities.execute(new GetDiningActivityUseCase.Request(session.activityId)).value;
        Domain.require(activity, 'ACTIVITY_NOT_FOUND');
        if (session.roomId) {
            const room = this.rooms.execute(new GetRoomUseCase.Request(session.roomId)).value;
            Domain.require(room && room.activityId === session.activityId && session.scopeId === room.id, 'ROOM_ACTIVITY_MISMATCH');
            Domain.require(room.members.some(member => member.id === identity.id && member.present && member.online)
                || (room.status === 'ENDED' && room.eligibleIds.includes(identity.id)), 'NOT_ELIGIBLE');
        } else {
            Domain.require(activity.mode === 'SINGLE' && session.scopeId === activity.id, 'SINGLE_ACTIVITY_REQUIRED');
            Domain.require(activity.status === 'ACTIVE', 'ALREADY_ENDED');
        }
        await this.select.execute(new SelectDiningSessionUseCase.Request(session));
        if (!session.roomId) this.connection.stop();
        return new RecoverDiningSelectionUseCase.Response(session);
    }
}
