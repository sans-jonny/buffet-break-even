import type {RoomConnectionStatus} from '../../model/types'
import type {RoomTransport} from '../../application/port/out/RoomTransport'

/** 基于 uni.connectSocket 的跨端实现（H5 / 微信小程序均可用）。 */
export class UniRoomSocket implements RoomTransport {
    private task: UniApp.SocketTask | null = null
    private opened = false
    private queue: string[] = []
    private readonly messageListeners: ((event: string, data: unknown) => void)[] = []
    private readonly statusListeners: ((status: RoomConnectionStatus, detail?: string) => void)[] = []

    constructor(private readonly url: string) {
    }

    connect(): void {
        if (this.task) return
        this.opened = false
        this.emit('connecting')
        const task = uni.connectSocket({url: this.url, complete: () => {}})
        this.task = task
        task.onOpen(() => {
            this.opened = true
            this.emit('open')
            const pending = this.queue
            this.queue = []
            for (const payload of pending) task.send({data: payload})
        })
        task.onMessage(result => {
            const raw = typeof result.data === 'string' ? result.data : ''
            let parsed: {event?: unknown; data?: unknown}
            try {
                parsed = JSON.parse(raw)
            } catch {
                return
            }
            const event = typeof parsed.event === 'string' ? parsed.event : ''
            this.messageListeners.forEach(listener => listener(event, parsed.data))
        })
        task.onClose(() => {
            this.opened = false
            this.task = null
            this.emit('closed')
        })
        task.onError(() => {
            this.opened = false
            this.emit('error', '连接失败，请重试')
        })
    }

    send(event: string, data?: unknown): void {
        if (!this.task) this.connect()
        const payload = JSON.stringify({event, data})
        if (this.opened && this.task) this.task.send({data: payload})
        else this.queue.push(payload)
    }

    onMessage(listener: (event: string, data: unknown) => void): void {
        this.messageListeners.push(listener)
    }

    onStatus(listener: (status: RoomConnectionStatus, detail?: string) => void): void {
        this.statusListeners.push(listener)
    }

    close(): void {
        if (this.task) {
            this.task.close({})
            this.task = null
        }
        this.opened = false
    }

    private emit(status: RoomConnectionStatus, detail?: string): void {
        this.statusListeners.forEach(listener => listener(status, detail))
    }
}
