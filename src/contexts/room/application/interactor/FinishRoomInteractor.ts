import type {FinishRoomInput} from '../port/in/FinishRoomInput'
import type {RoomTransport} from '../port/out/RoomTransport'

export class FinishRoomInteractor implements FinishRoomInput {
    constructor(private readonly transport: RoomTransport) {
    }

    execute(): void {
        this.transport.send('finish')
    }
}
