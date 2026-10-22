import type {RoomViewModel} from './RoomViewModel'

export function emptyRoomView(): RoomViewModel {
    return {
        connection: 'idle',
        roomCode: '',
        selfId: '',
        active: false,
        ticketPrice: 0,
        participants: [],
        selections: [],
        rounds: [],
        committedValue: 0,
        result: null,
        error: ''
    }
}
