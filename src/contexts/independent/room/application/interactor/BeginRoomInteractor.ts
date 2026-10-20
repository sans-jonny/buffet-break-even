import type {BeginRoomInput} from '../port/in/BeginRoomInput'
import type {RoomTransport} from '../port/out/RoomTransport'

export class BeginRoomInteractor implements BeginRoomInput {
    constructor(private readonly transport: RoomTransport) {
    }

    execute(request: BeginRoomInput.Request): void {
        this.transport.send('begin', {ticketPrice: request.ticketPrice})
    }
}
