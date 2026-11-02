import {LeaveDiningSessionUseCase} from '../../port/in/session/LeaveDiningSessionUseCase';
import {LeaveDiningRoomUseCase} from '../../port/in/room/LeaveDiningRoomUseCase';
import {ClearDiningSessionUseCase} from '../../port/in/device/ClearDiningSessionUseCase';
import {GetPersonalDiningUseCase} from '../../port/in/device/GetPersonalDiningUseCase';
import type {RoomConnection} from '../../port/out/session/RoomConnection';
import {InvalidRequestError} from '../../../../kernel/application/InvalidRequestError';
import {GetRoomUseCase} from '../../../../contexts/collaboration/application/port/in/GetRoomUseCase';

export class LeaveDiningSessionInteractor implements LeaveDiningSessionUseCase {
    constructor(private readonly leave: LeaveDiningRoomUseCase, private readonly clear: ClearDiningSessionUseCase,
                private readonly personal: GetPersonalDiningUseCase, private readonly connection: RoomConnection,
                private readonly rooms: GetRoomUseCase) {}
    async execute(_request: LeaveDiningSessionUseCase.Request): Promise<LeaveDiningSessionUseCase.Response> {
        const {session, identity} = this.personal.execute();
        if (!session) throw new InvalidRequestError('NO_DINING_SESSION');
        if (!identity) throw new InvalidRequestError('IDENTITY_REQUIRED');
        const room = session.roomId ? this.rooms.execute(new GetRoomUseCase.Request(session.roomId)).value : undefined;
        const member = room?.members.find(member => member.id === identity.id);
        // A previous leave may have committed before personal cleanup failed.
        // Retrying cleanup must not append another leave command.
        if (!member || member.present) {
            try {
                await this.leave.execute(new LeaveDiningRoomUseCase.Request(session, identity.id));
            } catch (error) {
                // A destroyed room cannot accept a leave event; its local session can still be cleared.
                if ((error as Error).message !== 'REJECTED_404') throw error;
            }
        }
        await this.clear.execute(new ClearDiningSessionUseCase.Request());
        this.connection.stop();
        return new LeaveDiningSessionUseCase.Response();
    }
}
