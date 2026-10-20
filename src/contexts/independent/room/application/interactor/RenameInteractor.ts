import type {RenameInput} from '../port/in/RenameInput'
import type {RoomTransport} from '../port/out/RoomTransport'

export class RenameInteractor implements RenameInput {
    constructor(private readonly transport: RoomTransport) {
    }

    execute(request: RenameInput.Request): void {
        this.transport.send('rename', {nickname: request.nickname})
    }
}
