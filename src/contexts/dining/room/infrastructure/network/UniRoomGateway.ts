import {ROOM_PROTOCOL_VERSION} from '@/utils/room-protocol'
import {UniUserIdentity} from '@/infrastructure/identity/UniUserIdentity'
import {validateCatalog, type DiningCatalog} from '@/utils/restaurant-catalog'
import type {RoomGateway} from '../../application/port/out/RoomGateway'
import type {RoomPresenter} from '../presentation/RoomPresenter'
import type {RoomMessage, RoomRequest, RoomSnapshot, RoomReceipt} from '@/utils/room-protocol'

type Identity = NonNullable<RoomMessage['identity']>
type Cache = {catalog?: DiningCatalog; restaurantId?: string; identity?: Identity; snapshot: RoomSnapshot | null; pending?: RoomRequest; entryKey: string; suspended?: boolean}
type Socket = ReturnType<typeof uni.connectSocket>
const KEY = 'buffet-room-v2'
const id = () => `${Date.now().toString(36)}_${Array.from({length: 40}, () => Math.floor(Math.random() * 36).toString(36)).join('')}`

/** Transport journal is persisted before sending; an uncertain operation is queried before any retry. */
export class UniRoomGateway implements RoomGateway {
    private cache: Cache = {snapshot: null, entryKey: ''}
    private socket?: Socket
    private status: 'idle' | 'connecting' | 'online' | 'offline' | 'expired' = 'idle'
    private message = ''
    private busy = false
    private historySaved = false
    private url = ''
    private stopped = true
    private attempt = 0
    private generation = 0
    private retry?: ReturnType<typeof setTimeout>
    private heartbeat?: ReturnType<typeof setInterval>
    private opening?: Promise<void>
    private cancelOpening?: (error: Error) => void
    private suspended = false
    private resumable = false
    private waiters = new Map<string, {resolve: (m: RoomMessage) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout>}>()

    constructor(private presenter: RoomPresenter, private importReceipt: (receipt: RoomReceipt) => void) {}

    async execute(command: string, params: Record<string, unknown>): Promise<void> {
        if (command === 'selectRestaurant') {
            const restaurantId = String(params.restaurantId)
            if (!this.cache.catalog?.restaurants.some(r => r.id === restaurantId)) throw new Error('餐厅不存在')
            this.cache.restaurantId = restaurantId; this.persist(); this.publish(); return
        }
        if (command === 'leave') {this.leave(); return}
        if (command === 'suspend') {
            this.load(); this.stop(); this.suspended = true; this.resumable = false
            this.cache.suspended = true; this.persist()
            this.status = 'idle'; this.busy = false; this.message = ''; this.publish(); return
        }
        if (this.busy) throw new Error('正在同步，请稍候')
        if (typeof params.url === 'string') {
            if (!/^wss?:\/\//.test(params.url)) throw new Error('请配置有效的 WebSocket 服务地址')
            this.url = params.url
        }
        if (command === 'check') {
            this.load(); this.suspended = true; this.resumable = false; this.publish()
            if (!this.cache.identity) return
            try {
                await this.connect()
                const result = await this.rpc('check', {roomId: this.cache.identity.roomId, code: this.cache.identity.code})
                this.resumable = Boolean(result.available)
                if (!this.resumable) this.message = '上次房间已失效或编号不匹配，可创建或加入新房间'
            } catch (error) {if (this.status !== 'expired') throw error}
            finally {
                // 检查只用于决定是否显示继续入口，不让已退出成员持续在线。
                this.stop()
                if (this.status !== 'expired') this.status = 'idle'
                this.publish()
            }
            return
        }
        if (command === 'resume') {
            this.load()
            if (params.automatic && this.cache.suspended) {this.suspended = true; this.publish(); return}
            this.suspended = false; this.cache.suspended = false
            this.persist()
            this.importFinal()
            this.publish()
            if (this.cache.identity || this.cache.pending) await this.connect()
            return
        }
        const userId = command === 'create' || command === 'join' ? new UniUserIdentity().load() : undefined
        if (command === 'create' || command === 'join') {
            this.suspended = false
            this.load()
            if (this.cache.identity || this.cache.pending) throw new Error('请先恢复或离开当前房间')
            await this.connect()
            if (!this.cache.entryKey) {
                const entry = await this.rpc('entry', {})
                if (!entry.entryKey) throw new Error('无法获取进入凭证，请重试')
                this.cache.entryKey = entry.entryKey
                this.persist()
            }
        } else if (this.status !== 'online') throw new Error('连接已断开，重连成功后再操作')
        if (this.cache.pending) throw new Error('上一操作结果待确认，请恢复连接后重试')
        if (command === 'sync') {await this.rpc('sync', {}); this.importFinal(); this.publish(); return}
        this.busy = true; this.message = ''; this.publish()
        const {url: _url, ...payload} = params
        const request: RoomRequest = {protocolVersion: ROOM_PROTOCOL_VERSION, requestId: id(), command,
            params: {...payload, ...(command === 'create' || command === 'join' ? {entryKey: this.cache.entryKey, userId} : {})}}
        this.cache.pending = request
        try {this.persist()} catch (error) {
            this.cache.pending = undefined; this.busy = false; this.publish()
            throw new Error('无法保存操作凭证，请检查存储空间后重试')
        }
        try {
            const result = await this.send(request)
            this.settle(request, result)
        } finally {this.busy = false; this.publish()}
    }

    private load() {
        if (this.socket || this.cache.identity || this.cache.pending) return
        const saved = uni.getStorageSync(KEY)
        if (!saved) {
            const legacy = uni.getStorageSync('buffet-room-v1')
            if (legacy?.snapshot?.receipt) this.cache.snapshot = {...legacy.snapshot, typeId: 'legacy', drafts: {}}
        }
        if (saved && typeof saved === 'object' && typeof saved.entryKey === 'string') {
            this.cache = saved
            this.suspended = Boolean(saved.suspended)
        }
    }
    private persist() {uni.setStorageSync(KEY, this.cache)}
    private publish() {this.presenter.present(this.suspended ? null : this.cache.snapshot, this.cache.identity?.memberId || '', this.status, this.message, this.busy, this.historySaved, this.resumable, this.cache.catalog, this.cache.restaurantId)}
    private importFinal() {
        if (!this.cache.snapshot?.receipt || this.historySaved) return
        try {this.importReceipt(this.cache.snapshot.receipt); this.historySaved = true}
        catch {this.historySaved = false; this.message = '本地点餐记录保存失败，请点击重试保存'}
    }
    private accept(message: RoomMessage) {
        if (message.catalog) {
            this.cache.catalog = validateCatalog(message.catalog)
            if (!this.cache.catalog.restaurants.some(r => r.id === this.cache.restaurantId)) this.cache.restaurantId = this.cache.catalog.restaurants[0].id
        }
        if (message.identity) this.cache.identity = message.identity
        const snapshot = message.snapshot
        const old = this.cache.snapshot
        if (snapshot && (!old || (snapshot.id === old.id && snapshot.revision >= old.revision))) {
            this.cache.snapshot = snapshot
            try {this.persist()} catch {this.message = '本地缓存失败，请保持页面打开并重试保存'}
            this.importFinal()
        }
        this.publish()
    }
    private settle(request: RoomRequest, message: RoomMessage) {
        if (this.cache.pending?.requestId === request.requestId) {this.cache.pending = undefined; this.persist()}
        this.accept(message)
        if (message.type === 'error') throw new Error(message.message || '操作失败')
    }
    private async recover() {
        if (this.cache.identity) await this.rpc('resume', {...this.cache.identity,userId:new UniUserIdentity().load()})
        const pending = this.cache.pending
        if (!pending) return
        if (pending.command === 'create' || pending.command === 'join') {
            this.settle(pending, await this.send(pending))
        } else {
            const status = await this.rpc('requestStatus', {targetRequestId: pending.requestId})
            this.settle(pending, status.processed && status.outcome ? status.outcome : await this.send(pending))
        }
    }
    private connect(): Promise<void> {
        if (this.status === 'online') return Promise.resolve()
        if (this.opening) return this.opening
        if (!this.url) return Promise.reject(new Error('未配置房间服务地址'))
        this.stopped = false
        if (this.retry) clearTimeout(this.retry)
        this.status = 'connecting'; this.publish()
        this.opening = new Promise<void>((resolve, reject) => {
            const generation = ++this.generation
            let ready = false, finished = false
            const socket = this.socket = uni.connectSocket({url: this.url, complete: () => {}})
            const timeout = setTimeout(() => {socket.close({}); lost(new Error('连接超时，将自动重试'))}, 10000)
            this.cancelOpening = error => {finished = true; clearTimeout(timeout); reject(error)}
            const lost = (error: Error) => {
                if (generation !== this.generation || finished) return
                finished = true; clearTimeout(timeout)
                socket.close({})
                if (this.heartbeat) clearInterval(this.heartbeat)
                this.socket = undefined; this.opening = undefined
                for (const waiter of this.waiters.values()) {clearTimeout(waiter.timer); waiter.reject(error)}
                this.waiters.clear()
                if (!this.stopped) {
                    this.status = 'offline'; this.message = error.message; this.publish()
                    const delay = Math.min(30000, 1000 * 2 ** Math.min(this.attempt++, 5)) + Math.random() * 500
                    this.retry = setTimeout(() => {void this.connect().catch(() => {})}, delay)
                }
                if (!ready) reject(error)
            }
            socket.onOpen(() => {
                clearTimeout(timeout)
                void this.recover().then(() => {
                    if (finished || this.stopped) return
                    ready = true; this.status = 'online'; this.attempt = 0; this.message = ''; this.importFinal(); this.publish()
                    this.heartbeat = setInterval(() => {if (this.cache.identity) void this.rpc('sync', {}).catch(error => {socket.close({}); lost(error)})}, 20000)
                    resolve()
                }).catch(error => {
                    if (this.stopped) {reject(error); return}
                    // A known failed pending action is resolved; do not stop a healthy room connection.
                    if (!this.cache.pending && this.cache.identity) {
                        ready = true; this.status = 'online'; this.message = error.message; this.publish(); resolve()
                        this.heartbeat = setInterval(() => {if (this.cache.identity) void this.rpc('sync', {}).catch(error => {socket.close({}); lost(error)})}, 20000)
                    } else {socket.close({}); lost(error)}
                })
            })
            socket.onMessage(event => {
                if (generation !== this.generation) return
                try {
                    const message = JSON.parse(String(event.data)) as RoomMessage
                    if (message.protocolVersion !== ROOM_PROTOCOL_VERSION) {this.expire('版本不兼容，请更新客户端'); reject(new Error(this.message)); return}
                    if (message.code === 'PROTOCOL_MISMATCH' ||
                        (['ROOM_NOT_FOUND', 'UNAUTHORIZED'].includes(message.code || '') && (this.cache.identity || message.operation === 'resume' || !message.requestId))) {
                        const waiter = message.requestId ? this.waiters.get(message.requestId) : undefined
                        if (waiter) {clearTimeout(waiter.timer); this.waiters.delete(message.requestId!); waiter.reject(new Error(message.message))}
                        this.expire(message.message || '房间已失效'); reject(new Error(this.message)); return
                    }
                    this.accept(message)
                    const waiter = message.requestId ? this.waiters.get(message.requestId) : undefined
                    if (waiter) {clearTimeout(waiter.timer); this.waiters.delete(message.requestId!); waiter.resolve(message)}
                    else if (message.type === 'error') {this.message = message.message || '操作失败'; this.publish()}
                } catch {this.message = '收到无效消息，请重试连接'; this.publish()}
            })
            socket.onClose(() => lost(new Error('连接已断开，正在自动重连')))
            socket.onError(() => lost(new Error('无法连接服务，正在自动重试')))
        }).finally(() => {this.opening = undefined; this.cancelOpening = undefined})
        return this.opening
    }
    private async rpc(command: string, params: Record<string, unknown>) {
        const result = await this.send({protocolVersion: ROOM_PROTOCOL_VERSION, requestId: id(), command, params})
        if (result.type === 'error') throw new Error(result.message)
        return result
    }
    private send(request: RoomRequest): Promise<RoomMessage> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {reject(new Error('连接未建立')); return}
            const timer = setTimeout(() => {
                this.waiters.delete(request.requestId); reject(new Error('操作确认超时，正在恢复连接'))
                this.socket?.close({})
            }, 10000)
            this.waiters.set(request.requestId, {resolve, reject, timer})
            this.socket.send({data: JSON.stringify(request), fail: () => {
                clearTimeout(timer); this.waiters.delete(request.requestId); reject(new Error('消息发送失败，请等待重连')); this.socket?.close({})
            }})
        })
    }
    private expire(message: string) {
        this.stop(new Error(message)); this.status = 'expired'; this.resumable = false; this.message = message; this.publish()
    }
    private stop(error = new Error('已取消房间连接')) {
        this.cancelOpening?.(error); this.cancelOpening = undefined
        this.stopped = true; this.generation++
        if (this.retry) clearTimeout(this.retry)
        if (this.heartbeat) clearInterval(this.heartbeat)
        for (const waiter of this.waiters.values()) {clearTimeout(waiter.timer); waiter.reject(new Error('已断开房间连接'))}
        this.waiters.clear(); this.socket?.close({}); this.socket = undefined; this.opening = undefined
    }
    private leave() {
        this.stop(); this.cache = {snapshot: null, entryKey: ''}; this.persist()
        this.suspended = false; this.resumable = false
        this.status = 'idle'; this.message = ''; this.busy = false; this.historySaved = false; this.publish()
    }
}
