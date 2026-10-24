import {randomInt, randomUUID, randomBytes} from 'node:crypto'
import {presetCatalog} from '../../src/data/restaurants'
import {validateCatalog, type DiningCatalog, type RestaurantMenu} from '../../src/utils/restaurant-catalog'
import {ROOM_PROTOCOL_VERSION, RoomMessage, RoomRequest, RoomSnapshot, RoomReceipt} from '../../src/utils/room-protocol'
import {isUserId} from '../../src/utils/user-id'

type Peer = {send(message: RoomMessage): void; roomId?: string; memberId?: string}
type Member = {id: string; userId?: string; nickname: string; token: string; joined: number; offlineAt: number | null; peers: Set<Peer>}
type Room = {catalog: DiningCatalog; snapshot: RoomSnapshot; members: Map<string, Member>; requests: Map<string, RoomMessage>;
    createdAt: number; emptyAt: number | null; endedAt: number | null}
class Fault extends Error {constructor(public code: string, message: string) {super(message)}}
function fail(code: string, message: string): never {throw new Fault(code, message)}
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const text = (value: unknown, max = 100) => typeof value === 'string' && value.trim().length > 0 && value.length <= max

/** All handlers are synchronous: validation, mutation, deduplication and broadcasts form one ordered turn. */
export class RoomService {
    private rooms = new Map<string, Room>()
    private codes = new Map<string, string>()
    private entries = new Map<string, {message: RoomMessage; roomId: string}>()
    constructor(private now = () => Date.now(), private code = () => String(randomInt(100000, 1000000))) {}

    handle(peer: Peer, raw: unknown): void {
        let request: RoomRequest | undefined
        let authenticated: Room | undefined
        try {
            if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('INVALID_REQUEST', '请求格式无效')
            request = raw as RoomRequest
            if (request.protocolVersion !== ROOM_PROTOCOL_VERSION) fail('PROTOCOL_MISMATCH', '版本不兼容，请更新客户端')
            if (!text(request.requestId, 100) || !text(request.command, 40) || !request.params || typeof request.params !== 'object' || Array.isArray(request.params)) fail('INVALID_REQUEST', '请求格式无效')
            const p = request.params
            if (request.command === 'check') {
                const room = this.rooms.get(String(p.roomId))
                peer.send({protocolVersion: ROOM_PROTOCOL_VERSION, type: 'response', requestId: request.requestId, operation: 'check',
                    available: Boolean(room && room.snapshot.code === p.code && this.codes.get(String(p.code)) === p.roomId)})
                return
            }
            if (request.command === 'entry') {
                peer.send({protocolVersion: ROOM_PROTOCOL_VERSION, type: 'response', requestId: request.requestId, operation: 'entry', entryKey: randomBytes(32).toString('hex')})
                return
            }
            if (request.command === 'create' || request.command === 'join') {
                this.enter(peer, request)
                return
            }
            if (request.command === 'resume') {
                this.resume(peer, request)
                return
            }
            const room = authenticated = this.authenticate(peer)
            const key = `${peer.memberId}:${request.requestId}`
            if (request.command === 'sync') {peer.send(this.response(request, room, peer.memberId!)); return}
            if (request.command === 'requestStatus') {
                if (!text(p.targetRequestId, 100)) fail('INVALID_REQUEST', '缺少待查询请求编号')
                const outcome = room.requests.get(`${peer.memberId}:${p.targetRequestId}`)
                peer.send(this.response(request, room, peer.memberId!, {processed: Boolean(outcome), outcome}))
                return
            }
            const old = room.requests.get(key)
            if (old) {peer.send(copy(old)); return}
            try {
                const changed = this.mutate(room, peer.memberId!, request)
                if (changed) room.snapshot.revision++
                const message = this.response(request, room, peer.memberId!)
                room.requests.set(key, message)
                peer.send(copy(message))
                if (changed) this.broadcast(room, request.command, peer.memberId!)
            } catch (error) {
                const message = this.error(request, error, room)
                room.requests.set(key, message)
                peer.send(copy(message))
            }
        } catch (error) {peer.send(this.error(request, error, authenticated))}
    }

    private enter(peer: Peer, request: RoomRequest) {
        const p = request.params
        if (p.userId !== undefined && !isUserId(p.userId)) fail('INVALID_USER_ID', '用户UUID无效，请重新进入应用')
        const userId = typeof p.userId === 'string' ? p.userId.toLowerCase() : undefined
        // A random client entry key allows recovery of a lost create/join acknowledgement.
        if (!text(p.entryKey, 128) || !/^[a-zA-Z0-9_-]{32,128}$/.test(p.entryKey as string)) fail('INVALID_REQUEST', '进入凭证无效')
        const key = `${p.entryKey}:${request.requestId}`
        const previous = this.entries.get(key)
        if (previous) {
            const identity = previous.message.identity!
            const room = this.rooms.get(previous.roomId)
            if (!room) fail('ROOM_NOT_FOUND', '房间已失效')
            if (room.members.get(identity.memberId)?.userId !== userId) fail('UNAUTHORIZED', '用户身份不匹配')
            if (peer.roomId && (peer.roomId !== room.snapshot.id || peer.memberId !== identity.memberId)) fail('ALREADY_JOINED', '请先离开当前房间')
            this.attach(peer, room, room.members.get(identity.memberId)!)
            peer.send({...copy(previous.message), snapshot: this.snapshot(room), catalog: copy(room.catalog)})
            return
        }
        if (!text(p.nickname, 20)) fail('INVALID_NICKNAME', '昵称需为1至20个字符')
        let room: Room
        if (request.command === 'create') {
            if (peer.roomId) fail('ALREADY_JOINED', '请先离开当前房间')
            if (this.rooms.size >= 5000) fail('ROOM_CAPACITY', '服务房间数已达上限，请稍后再试')
            const ticketPrice = this.price(p.ticketPrice)
            let catalog: DiningCatalog
            try {catalog = p.typeId === 'custom' ? validateCatalog(p.catalog) : presetCatalog(String(p.typeId))}
            catch {fail('INVALID_CATALOG', '菜单无效，请检查配置后重试')}
            if (catalog.typeId !== p.typeId) fail('INVALID_CATALOG', '菜单种类不匹配')
            let code = ''
            for (let i = 0; i < 100; i++) {code = this.code(); if (!this.codes.has(code)) break; code = ''}
            if (!code) fail('ROOM_CAPACITY', '暂时无法创建房间，请稍后再试')
            const id = randomUUID()
            room = {catalog, snapshot: {id, code, revision: 0, hostId: '', status: 'active', ticketPrice,
                typeId: catalog.typeId, drafts: Object.fromEntries(catalog.restaurants.map(r => [r.id, {selected: {}, rounds: []}])), members: [], receipt: null}, members: new Map(), requests: new Map(),
                createdAt: this.now(), emptyAt: null, endedAt: null}
            this.rooms.set(id, room); this.codes.set(code, id)
        } else {
            if (typeof p.code !== 'string' || !/^\d{6}$/.test(p.code)) fail('INVALID_CODE', '请输入六位房间号')
            room = this.rooms.get(this.codes.get(p.code) || '') || fail('ROOM_NOT_FOUND', '房间不存在或已失效')
        }
        const existing = userId ? [...room.members.values()].find(member => member.userId === userId) : undefined
        if (peer.roomId && (peer.roomId !== room.snapshot.id || peer.memberId !== existing?.id)) fail('ALREADY_JOINED', '请先离开当前房间')
        if (!existing && room.snapshot.status !== 'active') fail('ROOM_ENDED', '用餐已结束，不能加入')
        if (!existing && room.members.size >= 50) fail('ROOM_CAPACITY', '房间最多支持50人')
        const member: Member = existing || {id: randomUUID(), userId, nickname: (p.nickname as string).trim(), token: randomBytes(32).toString('hex'),
            joined: room.members.size, offlineAt: null, peers: new Set()}
        room.members.set(member.id, member)
        if (!room.snapshot.hostId) room.snapshot.hostId = member.id
        this.attach(peer, room, member)
        if (existing && room.snapshot.status === 'active' && member.nickname !== (p.nickname as string).trim()) {
            member.nickname = (p.nickname as string).trim()
            room.snapshot.revision++
            this.broadcast(room, 'rename', member.id)
        }
        const message = this.response(request, room, member.id, {identity: {roomId: room.snapshot.id, code: room.snapshot.code, memberId: member.id, token: member.token}, catalog: copy(room.catalog)})
        this.entries.set(key, {roomId: room.snapshot.id, message})
        peer.send(copy(message))
    }

    private resume(peer: Peer, request: RoomRequest) {
        const p = request.params
        const room = this.rooms.get(String(p.roomId)) || fail('ROOM_NOT_FOUND', '房间已失效，服务重启会清空临时房间')
        if (p.code !== room.snapshot.code || this.codes.get(String(p.code)) !== p.roomId) fail('ROOM_NOT_FOUND', '房间号和唯一ID不匹配')
        const member = room.members.get(String(p.memberId))
        if (!member || member.token !== p.token) fail('UNAUTHORIZED', '成员身份无效，请重新加入')
        if (p.userId !== undefined) {
            if (!isUserId(p.userId) || (member.userId && member.userId !== p.userId.toLowerCase())) fail('UNAUTHORIZED', '用户身份不匹配')
            // 旧客户端创建的成员首次携带有效凭证恢复时，绑定本机UUID。
            member.userId = p.userId.toLowerCase()
        }
        if (peer.roomId && (peer.roomId !== room.snapshot.id || peer.memberId !== member.id)) fail('ALREADY_JOINED', '请先离开当前房间')
        this.attach(peer, room, member)
        peer.send(this.response(request, room, member.id, {catalog: copy(room.catalog)}))
    }

    private attach(peer: Peer, room: Room, member: Member) {
        const wasOnline = member.peers.size > 0
        peer.roomId = room.snapshot.id; peer.memberId = member.id
        // Elect before restoring the old host's online flag, after its grace period has elapsed.
        this.elect(room)
        member.peers.add(peer); member.offlineAt = null; room.emptyAt = null
        if (!wasOnline) {room.snapshot.revision++; this.elect(room); this.broadcast(room, 'memberOnline', member.id)}
    }

    disconnect(peer: Peer) {
        const room = this.rooms.get(peer.roomId || '')
        const member = room?.members.get(peer.memberId || '')
        if (!room || !member || !member.peers.delete(peer)) return
        if (!member.peers.size) {
            member.offlineAt = this.now()
            room.snapshot.revision++
            if (![...room.members.values()].some(item => item.peers.size)) room.emptyAt = this.now()
            this.broadcast(room, 'memberOffline', member.id)
        }
        peer.roomId = undefined; peer.memberId = undefined
    }

    private elect(room: Room) {
        if (room.snapshot.status !== 'active') return
        const host = room.members.get(room.snapshot.hostId)
        if (!host || host.peers.size || host.offlineAt === null || this.now() - host.offlineAt < 60000) return
        const next = [...room.members.values()].filter(member => member.peers.size).sort((a, b) => a.joined - b.joined)[0]
        if (next) {room.snapshot.hostId = next.id; room.snapshot.revision++; this.broadcast(room, 'hostChanged', next.id)}
    }

    sweep() {
        for (const [id, room] of this.rooms) {
            const expired = room.endedAt !== null ? this.now() - room.endedAt >= 86400000
                : room.emptyAt !== null && this.now() - room.emptyAt >= 1800000
            if (expired) {
                for (const member of room.members.values()) for (const peer of member.peers) {
                    peer.send({protocolVersion: ROOM_PROTOCOL_VERSION, type: 'error', operation: 'expired', code: 'ROOM_NOT_FOUND', message: '房间已过期'})
                    peer.roomId = undefined; peer.memberId = undefined
                }
                this.rooms.delete(id); this.codes.delete(room.snapshot.code)
                for (const [key, entry] of this.entries) if (entry.roomId === id) this.entries.delete(key)
            } else this.elect(room)
        }
    }

    private authenticate(peer: Peer): Room {
        const room = this.rooms.get(peer.roomId || '') || fail('ROOM_NOT_FOUND', '房间不存在或已失效')
        if (!room.members.get(peer.memberId || '')?.peers.has(peer)) fail('UNAUTHORIZED', '请先恢复成员身份')
        return room
    }
    private price(value: unknown) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 10000000 || Math.round(value * 100) <= 0) fail('INVALID_PRICE', '门票需大于零且不超过一千万元')
        return Math.round((value as number) * 100) / 100
    }
    private mutate(room: Room, actor: string, request: RoomRequest): boolean {
        const s = room.snapshot, p = request.params
        if (request.command === 'sync') return false
        if (!['rename', 'changeSelection', 'commitRound', 'setPrice', 'end', 'transferHost'].includes(request.command)) fail('UNKNOWN_COMMAND', '未知操作')
        if (s.status !== 'active') fail('ROOM_ENDED', '用餐已结束')
        if (request.command === 'rename') {
            if (!text(p.nickname, 20)) fail('INVALID_NICKNAME', '昵称需为1至20个字符')
            const member = room.members.get(actor)!
            const nickname = (p.nickname as string).trim()
            if (member.nickname === nickname) return false
            member.nickname = nickname; return true
        }
        if (['setPrice', 'end', 'commitRound', 'transferHost'].includes(request.command) && actor !== s.hostId) fail('FORBIDDEN', '只有房主可以执行此操作')
        if (request.command !== 'changeSelection' && p.expectedRevision !== s.revision) fail('REVISION_CONFLICT', '房间已更新，请查看最新内容后重新确认')
        if (request.command === 'transferHost') {
            const target = room.members.get(String(p.targetMemberId))
            if (!target || target.id === actor || !target.peers.size) fail('INVALID_TARGET', '请选择另一位在线成员')
            s.hostId = target.id; return true
        }
        if (request.command === 'setPrice') {
            const price = this.price(p.ticketPrice)
            if (s.ticketPrice === price) return false
            s.ticketPrice = price; return true
        }
        const restaurant = room.catalog.restaurants.find(r => r.id === p.restaurantId)
        if (!restaurant) fail('INVALID_RESTAURANT', '餐厅不属于此房间菜单')
        const draft = s.drafts[restaurant.id]
        if (request.command === 'changeSelection') {
            if (typeof p.productId !== 'string' || !restaurant.products.some(product => product.id === p.productId) || (p.change !== 1 && p.change !== -1)) fail('INVALID_PRODUCT', '菜品或数量无效')
            const id = p.productId, count = Math.max(0, (draft.selected[id] || 0) + p.change)
            if (count > 10000) fail('QUANTITY_LIMIT', '单个菜品最多10000份')
            if (count === (draft.selected[id] || 0)) return false
            if (count) draft.selected[id] = count; else delete draft.selected[id]
            return true
        }
        if (request.command === 'end' && !draft.rounds.length && !Object.keys(draft.selected).length) fail('EMPTY_DINING', '先点一些菜吧')
        const committed = this.commit(draft, restaurant)
        if (request.command === 'end') {
            s.status = 'ended'; room.endedAt = this.now(); s.receipt = this.receipt(s, draft, restaurant, room.catalog)
            s.drafts = {[restaurant.id]: draft}
            s.receipt.participants = [...room.members.values()].map(member => member.nickname)
            return true
        }
        return committed
    }
    private commit(draft: RoomSnapshot['drafts'][string], restaurant: RestaurantMenu) {
        const lines = Object.entries(draft.selected).map(([id, count]) => {const p = restaurant.products.find(p => p.id === id)!; return {name: p.name, count, price: p.price}})
        if (!lines.length) return false
        draft.rounds.push({time: new Date(this.now()).toISOString(), value: lines.reduce((sum, line) => sum + Math.round(line.price * 100) * line.count, 0) / 100, lines})
        draft.selected = {}; return true
    }
    private receipt(s: RoomSnapshot, draft: RoomSnapshot['drafts'][string], restaurant: RestaurantMenu, catalog: DiningCatalog): RoomReceipt {
        const lines = new Map<string, {name: string; count: number; price: number}>()
        for (const round of draft.rounds) for (const line of round.lines) {
            const old = lines.get(line.name)
            if (old) old.count += line.count; else lines.set(line.name, {...line})
        }
        return {id: s.id, restaurant: restaurant.name, restaurantId: restaurant.id, typeId: catalog.typeId, typeName: catalog.typeName, date: new Date(this.now()).toISOString(), price: s.ticketPrice,
            value: draft.rounds.reduce((sum, round) => sum + Math.round(round.value * 100), 0) / 100,
            lines: [...lines.values()], rounds: copy(draft.rounds)}
    }
    private snapshot(room: Room): RoomSnapshot {
        return copy({...room.snapshot, members: [...room.members.values()].map(member => ({id: member.id, nickname: member.nickname, online: member.peers.size > 0}))})
    }
    private response(request: RoomRequest, room: Room, actorId: string, extra: Partial<RoomMessage> = {}): RoomMessage {
        return {protocolVersion: ROOM_PROTOCOL_VERSION, type: 'response', requestId: request.requestId, operation: request.command, actorId, snapshot: this.snapshot(room), ...extra}
    }
    private error(request: RoomRequest | undefined, error: unknown, room?: Room): RoomMessage {
        return {protocolVersion: ROOM_PROTOCOL_VERSION, type: 'error', requestId: request?.requestId, operation: request?.command || 'invalid',
            code: error instanceof Fault ? error.code : 'INTERNAL_ERROR', message: error instanceof Fault ? error.message : '服务暂时不可用',
            ...(room ? {snapshot: this.snapshot(room)} : {})}
    }
    private broadcast(room: Room, operation: string, actorId: string) {
        const message: RoomMessage = {protocolVersion: ROOM_PROTOCOL_VERSION, type: 'snapshot', operation, actorId, snapshot: this.snapshot(room)}
        for (const member of room.members.values()) for (const peer of member.peers) peer.send(copy(message))
    }
}
