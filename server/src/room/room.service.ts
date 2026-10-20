import {randomUUID} from 'node:crypto'
import {Room} from '@buffet/shared'
import type {Product, RoomResult, RoomSnapshot} from '@buffet/shared'

export interface RoomClock {
    time(): string
    date(): string
}

const pad = (value: number) => String(value).padStart(2, '0')

export const systemClock: RoomClock = {
    time: () => {
        const d = new Date()
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    date: () => {
        const d = new Date()
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
}

interface RoomRecord {
    room: Room
    tokens: Map<string, string>
    lastActivity: number
}

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_TTL_MS = 30 * 60 * 1000

/** 纯房间编排：维护内存房间表，用共享领域 Room 校验每次意图，返回最新权威快照。无 NestJS 依赖，便于单测。 */
export class RoomService {
    private readonly rooms = new Map<string, RoomRecord>()

    constructor(private readonly products: readonly Product[], private readonly clock: RoomClock = systemClock) {
    }

    createRoom(nickname: string): {roomCode: string; participantId: string; token: string; state: RoomSnapshot} {
        const roomCode = this.generateRoomCode()
        const participantId = randomUUID()
        const token = randomUUID()
        const room = Room.create(roomCode, {id: participantId, nickname, isHost: true})
        this.rooms.set(roomCode, {room, tokens: new Map([[participantId, token]]), lastActivity: Date.now()})
        return {roomCode, participantId, token, state: room.toSnapshot()}
    }

    joinRoom(roomCode: string, nickname: string): {participantId: string; token: string; state: RoomSnapshot} {
        const record = this.requireRoom(roomCode)
        const participantId = randomUUID()
        const token = randomUUID()
        record.room = record.room.join({id: participantId, nickname, isHost: false})
        record.tokens.set(participantId, token)
        record.lastActivity = Date.now()
        return {participantId, token, state: record.room.toSnapshot()}
    }

    rename(roomCode: string, participantId: string, nickname: string): RoomSnapshot {
        const record = this.requireRoom(roomCode)
        record.room = record.room.rename(participantId, nickname)
        record.lastActivity = Date.now()
        return record.room.toSnapshot()
    }

    begin(roomCode: string, participantId: string, ticketPrice: number): RoomSnapshot {
        const record = this.requireRoom(roomCode)
        record.room = record.room.begin(participantId, ticketPrice)
        record.lastActivity = Date.now()
        return record.room.toSnapshot()
    }

    changeSelection(roomCode: string, participantId: string, productId: string, change: 1 | -1): RoomSnapshot {
        const record = this.requireRoom(roomCode)
        record.room = record.room.changeSelection(participantId, productId, change, this.products)
        record.lastActivity = Date.now()
        return record.room.toSnapshot()
    }

    commitRound(roomCode: string, participantId: string): RoomSnapshot {
        const record = this.requireRoom(roomCode)
        record.room = record.room.commitRound(participantId, this.products, this.clock.time())
        record.lastActivity = Date.now()
        return record.room.toSnapshot()
    }

    finish(roomCode: string, participantId: string): RoomResult {
        const record = this.requireRoom(roomCode)
        const result = record.room.finish(participantId, this.clock.date())
        if (!result) throw new Error('用餐尚未开始')
        record.lastActivity = Date.now()
        return result
    }

    close(roomCode: string, participantId: string): RoomSnapshot {
        const record = this.requireRoom(roomCode)
        record.room = record.room.close(participantId)
        record.lastActivity = Date.now()
        return record.room.toSnapshot()
    }

    /** 参与者离开；房主离开则销毁房间并返回 null。 */
    leave(roomCode: string, participantId: string): RoomSnapshot | null {
        const record = this.rooms.get(roomCode)
        if (!record) return null
        if (record.room.hostId === participantId) {
            this.rooms.delete(roomCode)
            return null
        }
        record.room = record.room.leave(participantId)
        record.tokens.delete(participantId)
        record.lastActivity = Date.now()
        return record.room.toSnapshot()
    }

    getRoom(roomCode: string): RoomSnapshot | null {
        return this.rooms.get(roomCode)?.room.toSnapshot() ?? null
    }

    destroy(roomCode: string): void {
        this.rooms.delete(roomCode)
    }

    /** 清理空闲超时的房间，由定时任务周期调用。 */
    sweep(now: number = Date.now(), maxIdleMs: number = ROOM_TTL_MS): void {
        for (const [code, record] of this.rooms) {
            if (now - record.lastActivity > maxIdleMs) this.rooms.delete(code)
        }
    }

    private requireRoom(roomCode: string): RoomRecord {
        const record = this.rooms.get(roomCode)
        if (!record) throw new Error('房间不存在')
        return record
    }

    private generateRoomCode(): string {
        let code = ''
        for (let i = 0; i < 6; i++) code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
        return this.rooms.has(code) ? this.generateRoomCode() : code
    }
}
