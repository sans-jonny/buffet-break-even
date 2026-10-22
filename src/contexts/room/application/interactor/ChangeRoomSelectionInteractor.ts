import type {ChangeRoomSelectionInput} from '../port/in/ChangeRoomSelectionInput'
import type {RoomTransport} from '../port/out/RoomTransport'

export class ChangeRoomSelectionInteractor implements ChangeRoomSelectionInput {
    constructor(private readonly transport: RoomTransport) {
    }

    execute(request: ChangeRoomSelectionInput.Request): void {
        this.transport.send('changeSelection', {productId: request.productId, change: request.change})
    }
}
