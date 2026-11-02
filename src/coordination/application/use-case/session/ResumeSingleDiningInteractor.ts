import {ResumeSingleDiningUseCase} from '../../port/in/session/ResumeSingleDiningUseCase';
import {SelectDiningSessionUseCase} from '../../port/in/device/SelectDiningSessionUseCase';
import type {RoomConnection} from '../../port/out/session/RoomConnection';

export class ResumeSingleDiningInteractor implements ResumeSingleDiningUseCase {
    constructor(private readonly select: SelectDiningSessionUseCase, private readonly connection: RoomConnection) {}
    async execute(request: ResumeSingleDiningUseCase.Request): Promise<ResumeSingleDiningUseCase.Response> {
        await this.select.execute(new SelectDiningSessionUseCase.Request(request.session));
        this.connection.stop();
        return new ResumeSingleDiningUseCase.Response(request.session);
    }
}
