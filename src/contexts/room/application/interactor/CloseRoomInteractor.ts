import type {CloseRoomInput} from '../port/in/CloseRoomInput'
import type {RoomTransport} from '../port/out/RoomTransport'

export class CloseRoomInteractor implements CloseRoomInput {
    constructor(private readonly transport: RoomTransport) {
    }

    execute(): void {
        this.transport.send('close')
    }
}
