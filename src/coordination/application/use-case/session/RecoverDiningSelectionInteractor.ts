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
        const activity = this.activities.execute(new GetDiningActivityUseCase.Request(session.activityId, session.roomId ? undefined : {singleScopeId: session.scopeId})).value;
        Domain.require(activity, 'ACTIVITY_NOT_FOUND');
        if (session.roomId) this.rooms.execute(new GetRoomUseCase.Request(session.roomId,
            {activityId: session.activityId, scopeId: session.scopeId, memberId: identity.id, access: 'RECOVER'}));
        await this.select.execute(new SelectDiningSessionUseCase.Request(session));
        if (!session.roomId) this.connection.stop();
        return new RecoverDiningSelectionUseCase.Response(session);
    }
}
