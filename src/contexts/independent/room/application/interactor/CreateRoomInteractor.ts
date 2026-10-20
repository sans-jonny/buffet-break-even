import type {CreateRoomInput} from '../port/in/CreateRoomInput'
import type {RoomTransport} from '../port/out/RoomTransport'

export class CreateRoomInteractor implements CreateRoomInput {
    constructor(private readonly transport: RoomTransport) {
    }

    execute(request: CreateRoomInput.Request): void {
        this.transport.send('createRoom', {nickname: request.nickname})
    }
}
