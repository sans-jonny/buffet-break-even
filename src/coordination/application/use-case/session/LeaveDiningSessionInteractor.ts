import {LeaveDiningSessionUseCase} from '../../port/in/session/LeaveDiningSessionUseCase';
import {LeaveDiningRoomUseCase} from '../../port/in/room/LeaveDiningRoomUseCase';
import {ClearDiningSessionUseCase} from '../../port/in/device/ClearDiningSessionUseCase';
import {GetPersonalDiningUseCase} from '../../port/in/device/GetPersonalDiningUseCase';
import type {RoomConnection} from '../../port/out/session/RoomConnection';
import {InvalidRequestError} from '../../../../kernel/application/InvalidRequestError';

export class LeaveDiningSessionInteractor implements LeaveDiningSessionUseCase {
    constructor(private readonly leave: LeaveDiningRoomUseCase, private readonly clear: ClearDiningSessionUseCase,
                private readonly personal: GetPersonalDiningUseCase, private readonly connection: RoomConnection) {}
    async execute(_request: LeaveDiningSessionUseCase.Request): Promise<LeaveDiningSessionUseCase.Response> {
        const {session, identity} = this.personal.execute();
        if (!session) throw new InvalidRequestError('NO_DINING_SESSION');
        if (!identity) throw new InvalidRequestError('IDENTITY_REQUIRED');
        await this.leave.execute(new LeaveDiningRoomUseCase.Request(session, identity.id));
        await this.clear.execute(new ClearDiningSessionUseCase.Request());
        this.connection.stop();
        return new LeaveDiningSessionUseCase.Response();
    }
}
