import {AcknowledgeDiningSubmissionUseCase} from '../../port/in/session/AcknowledgeDiningSubmissionUseCase';
import {GetPersonalDiningUseCase} from '../../port/in/device/GetPersonalDiningUseCase';
import type {RoomConnection} from '../../port/out/session/RoomConnection';

export class AcknowledgeDiningSubmissionInteractor implements AcknowledgeDiningSubmissionUseCase {
    constructor(private readonly personal: GetPersonalDiningUseCase, private readonly connection: RoomConnection) {}
    async execute(_request: AcknowledgeDiningSubmissionUseCase.Request): Promise<AcknowledgeDiningSubmissionUseCase.Response> {
        const roomId = this.personal.execute().session?.roomId;
        if (roomId) await this.connection.acknowledge(roomId);
        return new AcknowledgeDiningSubmissionUseCase.Response();
    }
}
