import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets'
import type {WebSocket, WebSocketServer as WsServer} from 'ws'
import {RoomService} from './room.service'
import {config} from '../config'
import type {
    BeginData,
    ChangeSelectionData,
    CreateRoomData,
    JoinRoomData,
    RenameData,
    ServerEvent
} from './protocol'

interface ClientMeta {
    roomCode?: string
    participantId?: string
}

@WebSocketGateway({path: config.wsPath})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: WsServer

    private readonly meta = new WeakMap<WebSocket, ClientMeta>()
    private readonly clientsByRoom = new Map<string, Set<WebSocket>>()

    constructor(private readonly service: RoomService) {
    }

    handleConnection(client: WebSocket): void {
        this.meta.set(client, {})
    }

    handleDisconnect(client: WebSocket): void {
        const current = this.meta.get(client)
        if (!current?.roomCode || !current.participantId) return
        this.detach(client)
        const snapshot = this.service.getRoom(current.roomCode)
        if (!snapshot) return
        if (snapshot.hostId === current.participantId) {
            this.service.destroy(current.roomCode)
            this.broadcast(current.roomCode, {event: 'roomEnded', data: {}})
        } else {
            const next = this.service.leave(current.roomCode, current.participantId)
            if (next) this.broadcast(current.roomCode, {event: 'roomState', data: next})
        }
    }

    @SubscribeMessage('createRoom')
    onCreateRoom(client: WebSocket, data: CreateRoomData): void {
        this.guard(client, () => {
            const nickname = this.asString(data?.nickname)
            const result = this.service.createRoom(nickname)
            this.attach(client, result.roomCode, result.participantId)
            this.send(client, {
                event: 'created',
                data: {roomCode: result.roomCode, participantId: result.participantId, token: result.token}
            })
            this.broadcast(result.roomCode, {event: 'roomState', data: result.state})
        })
    }

    @SubscribeMessage('joinRoom')
    onJoinRoom(client: WebSocket, data: JoinRoomData): void {
        this.guard(client, () => {
            const roomCode = this.asString(data?.roomCode)
            const nickname = this.asString(data?.nickname)
            const result = this.service.joinRoom(roomCode, nickname)
            this.attach(client, roomCode, result.participantId)
            this.send(client, {
                event: 'joined',
                data: {roomCode, participantId: result.participantId, token: result.token}
            })
            this.broadcast(roomCode, {event: 'roomState', data: result.state})
        })
    }

    @SubscribeMessage('rename')
    onRename(client: WebSocket, data: RenameData): void {
        this.guard(client, () => {
            const {roomCode, participantId} = this.requireSelf(client)
            const state = this.service.rename(roomCode, participantId, this.asString(data?.nickname))
            this.broadcast(roomCode, {event: 'roomState', data: state})
        })
    }

    @SubscribeMessage('begin')
    onBegin(client: WebSocket, data: BeginData): void {
        this.guard(client, () => {
            const {roomCode, participantId} = this.requireSelf(client)
            const state = this.service.begin(roomCode, participantId, this.asNumber(data?.ticketPrice))
            this.broadcast(roomCode, {event: 'roomState', data: state})
        })
    }

    @SubscribeMessage('changeSelection')
    onChangeSelection(client: WebSocket, data: ChangeSelectionData): void {
        this.guard(client, () => {
            const {roomCode, participantId} = this.requireSelf(client)
            const state = this.service.changeSelection(roomCode, participantId,
                this.asString(data?.productId), this.asChange(data?.change))
            this.broadcast(roomCode, {event: 'roomState', data: state})
        })
    }

    @SubscribeMessage('commitRound')
    onCommitRound(client: WebSocket): void {
        this.guard(client, () => {
            const {roomCode, participantId} = this.requireSelf(client)
            const state = this.service.commitRound(roomCode, participantId)
            this.broadcast(roomCode, {event: 'roomState', data: state})
        })
    }

    @SubscribeMessage('finish')
    onFinish(client: WebSocket): void {
        this.guard(client, () => {
            const {roomCode, participantId} = this.requireSelf(client)
            const result = this.service.finish(roomCode, participantId)
            this.broadcast(roomCode, {event: 'finished', data: result})
        })
    }

    @SubscribeMessage('close')
    onClose(client: WebSocket): void {
        this.guard(client, () => {
            const {roomCode, participantId} = this.requireSelf(client)
            const state = this.service.close(roomCode, participantId)
            this.broadcast(roomCode, {event: 'roomState', data: state})
        })
    }

    @SubscribeMessage('leave')
    onLeave(client: WebSocket): void {
        this.guard(client, () => {
            const current = this.meta.get(client)
            if (!current?.roomCode || !current.participantId) return
            this.detach(client)
            const next = this.service.leave(current.roomCode, current.participantId)
            if (next) this.broadcast(current.roomCode, {event: 'roomState', data: next})
            else this.broadcast(current.roomCode, {event: 'roomEnded', data: {}})
            this.send(client, {event: 'left', data: {}})
        })
    }

    private requireSelf(client: WebSocket): {roomCode: string; participantId: string} {
        const current = this.meta.get(client)
        if (!current?.roomCode || !current.participantId) throw new Error('尚未加入房间')
        return {roomCode: current.roomCode, participantId: current.participantId}
    }

    private guard(client: WebSocket, work: () => void): void {
        try {
            work()
        } catch (err) {
            this.send(client, {
                event: 'error',
                data: {code: 'INVALID', message: err instanceof Error ? err.message : '操作失败'}
            })
        }
    }

    private attach(client: WebSocket, roomCode: string, participantId: string): void {
        this.meta.set(client, {roomCode, participantId})
        if (!this.clientsByRoom.has(roomCode)) this.clientsByRoom.set(roomCode, new Set())
        this.clientsByRoom.get(roomCode)!.add(client)
    }

    private detach(client: WebSocket): void {
        const current = this.meta.get(client)
        if (current?.roomCode) this.clientsByRoom.get(current.roomCode)?.delete(client)
        this.meta.set(client, {})
    }

    private send(client: WebSocket, event: ServerEvent): void {
        client.send(JSON.stringify(event))
    }

    private broadcast(roomCode: string, event: ServerEvent): void {
        const payload = JSON.stringify(event)
        const clients = this.clientsByRoom.get(roomCode)
        if (clients) for (const client of clients) client.send(payload)
    }

    private asString(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) throw new Error('参数无效')
        return value.trim()
    }

    private asNumber(value: unknown): number {
        if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('参数无效')
        return value
    }

    private asChange(value: unknown): 1 | -1 {
        if (value !== 1 && value !== -1) throw new Error('参数无效')
        return value
    }
}
