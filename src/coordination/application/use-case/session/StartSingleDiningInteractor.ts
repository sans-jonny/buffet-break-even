import {DiningSelectionPendingError} from '../../service/DiningSelectionPendingError';
import {StartSingleDiningUseCase} from '../../port/in/session/StartSingleDiningUseCase';
import {CreateSingleDiningUseCase} from '../../port/in/dining/CreateSingleDiningUseCase';
import {SelectDiningSessionUseCase} from '../../port/in/device/SelectDiningSessionUseCase';
import type {RoomConnection} from '../../port/out/session/RoomConnection';

/** Business creation and personal selection retain their own commit boundaries. */
export class StartSingleDiningInteractor implements StartSingleDiningUseCase {
    constructor(private readonly create: CreateSingleDiningUseCase, private readonly select: SelectDiningSessionUseCase,
                private readonly connection: RoomConnection, private readonly id: () => string) {}
    async execute(request: StartSingleDiningUseCase.Request): Promise<StartSingleDiningUseCase.Response> {
        const response = await this.create.execute(new CreateSingleDiningUseCase.Request(
            this.id(), request.ticketPriceMinor, request.categoryId, request.replaceActivityId));
        try {
            await this.select.execute(new SelectDiningSessionUseCase.Request(response.value));
        } catch (error) {
            throw new DiningSelectionPendingError(response.value, error);
        }
        this.connection.stop();
        return new StartSingleDiningUseCase.Response(response.value);
    }
}
