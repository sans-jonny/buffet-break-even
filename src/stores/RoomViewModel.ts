export interface RoomViewModel {
    connection: 'idle' | 'connecting' | 'open' | 'closed'
    roomCode: string
    selfId: string
    active: boolean
    ticketPrice: number
    participants: {id: string; nickname: string; isHost: boolean; isSelf: boolean}[]
    selections: {participantId: string; nickname: string; lines: {id: string; name: string; price: number; count: number; emoji: string; gradient: string}[]}[]
    rounds: {participantId: string; nickname: string; time: string; value: number; lines: {name: string; price: number; count: number}[]}[]
    committedValue: number
    result: null | {
        date: string
        price: number
        value: number
        lines: {name: string; price: number; count: number}[]
        rounds: {participantId: string; nickname: string; time: string; value: number; lines: {name: string; price: number; count: number}[]}[]
        byParticipant: {participantId: string; nickname: string; value: number; lines: {name: string; price: number; count: number}[]}[]
    }
    error: string
}
