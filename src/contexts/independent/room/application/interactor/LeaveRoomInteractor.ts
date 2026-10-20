import type {LeaveRoomInput} from '../port/in/LeaveRoomInput'
import type {RoomTransport} from '../port/out/RoomTransport'

export class LeaveRoomInteractor implements LeaveRoomInput {
    constructor(private readonly transport: RoomTransport) {
    }

    execute(): void {
        this.transport.send('leave')
    }
}
