import {RefreshDiningSessionUseCase} from '../../port/in/session/RefreshDiningSessionUseCase';
import {GetPersonalDiningUseCase} from '../../port/in/device/GetPersonalDiningUseCase';
import type {RoomConnection} from '../../port/out/session/RoomConnection';

export class RefreshDiningSessionInteractor implements RefreshDiningSessionUseCase {
    constructor(private readonly personal: GetPersonalDiningUseCase, private readonly connection: RoomConnection) {}
    async execute(_request: RefreshDiningSessionUseCase.Request): Promise<RefreshDiningSessionUseCase.Response> {
        const roomId = this.personal.execute().session?.roomId;
        if (roomId) await this.connection.watch(roomId);
        return new RefreshDiningSessionUseCase.Response();
    }
}
