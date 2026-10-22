import type {RoomConnectionStatus} from '../../../model/types'

export interface RoomTransport {
    connect(): void

    close(): void

    send(event: string, data?: unknown): void

    onMessage(listener: (event: string, data: unknown) => void): void

    onStatus(listener: (status: RoomConnectionStatus, detail?: string) => void): void
}
