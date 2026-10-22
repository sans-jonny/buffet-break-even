import type {CommitRoomRoundInput} from '../port/in/CommitRoomRoundInput'
import type {RoomTransport} from '../port/out/RoomTransport'

export class CommitRoomRoundInteractor implements CommitRoomRoundInput {
    constructor(private readonly transport: RoomTransport) {
    }

    execute(): void {
        this.transport.send('commitRound')
    }
}
