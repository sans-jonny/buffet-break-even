import type {RoomResult, RoomSnapshot} from '@buffet/shared'

// WebSocket 消息契约。客户端发送 { event, data }，服务端按 event 路由到网关处理。
// 除 createRoom / joinRoom 外，房间码与参与者身份由连接上下文（socket → 参与者）提供，
// 不从消息体信任，避免冒用他人身份。

export interface CreateRoomData {
    nickname: string
}

export interface JoinRoomData {
    roomCode: string
    nickname: string
}

export interface RenameData {
    nickname: string
}

export interface BeginData {
    ticketPrice: number
}

export interface ChangeSelectionData {
    productId: string
    change: number
}

// —— 服务端 → 客户端 ——

export interface CredentialsData {
    roomCode: string
    participantId: string
    token: string
}

export interface ErrorData {
    code: string
    message: string
}

export type RoomStateData = RoomSnapshot

export type FinishedData = RoomResult

export type ServerEvent =
    | {event: 'created'; data: CredentialsData}
    | {event: 'joined'; data: CredentialsData}
    | {event: 'roomState'; data: RoomStateData}
    | {event: 'finished'; data: FinishedData}
    | {event: 'roomEnded'; data: {}}
    | {event: 'left'; data: {}}
    | {event: 'error'; data: ErrorData}
