// 多人房间 WS 契约类型（前端侧自包含声明）。
// 字段与服务端 server/src/room/protocol.ts 及 @buffet/shared 的 Room 类型一一对应，
// 契约变更时需两边同步。前端不依赖 @buffet/shared，以免内层 import 裸模块。

export type RoomConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

export type RoomProduct = {id: string; name: string; price: number}

export type RoomParticipant = {id: string; nickname: string; isHost: boolean}

export type RoomSavedLine = {name: string; price: number; count: number}

/** 一轮由单个参与者提交，昵称取提交时快照，保证"当时是谁"不随改名漂移。 */
export type RoomRound = {participantId: string; nickname: string; time: string; value: number; lines: RoomSavedLine[]}

/** 每个参与者的待选数量，按参与者分片。 */
export type RoomSelections = Record<string, Record<string, number>>

export type RoomSnapshot = {
    code: string
    hostId: string
    active: boolean
    ticketPrice: number
    participants: RoomParticipant[]
    selections: RoomSelections
    rounds: RoomRound[]
}

/** 某参与者按名称归并后的分账明细。 */
export type RoomParticipantTotals = {participantId: string; nickname: string; value: number; lines: RoomSavedLine[]}

export type RoomResult = {
    code: string
    date: string
    price: number
    value: number
    lines: RoomSavedLine[]
    rounds: RoomRound[]
    byParticipant: RoomParticipantTotals[]
}

export type RoomCredentials = {roomCode: string; participantId: string; token: string}

export type RoomError = {code: string; message: string}
