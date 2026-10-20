import type {JoinRoomInput} from '../port/in/JoinRoomInput'
import type {RoomTransport} from '../port/out/RoomTransport'

export class JoinRoomInteractor implements JoinRoomInput {
    constructor(private readonly transport: RoomTransport) {
    }

    execute(request: JoinRoomInput.Request): void {
        this.transport.send('joinRoom', {roomCode: request.roomCode, nickname: request.nickname})
    }
}
