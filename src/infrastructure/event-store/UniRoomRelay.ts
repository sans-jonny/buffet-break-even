import type {RestaurantRecord} from '../../../protocol/RestaurantRecord';
import {StreamConflictError} from '../../kernel/application/StreamConflictError'
import {EventBatch} from '../../../protocol/EventBatch'
import {BatchRuntime} from '../projection/BatchRuntime'
import {RoomHeartbeat} from '../../../protocol/RoomHeartbeat'

export namespace UniRoomRelay {
    export class Client implements BatchRuntime.Remote {
        constructor(private readonly baseUrl: string,
                    private readonly receiveCatalog?: (roomId: string, catalog: RestaurantRecord.Catalog) => void) {
        }

        create(): Promise<{ roomId: string; code: string }> {
            return this.request('/rooms', 'POST', {})
        }

        locate(code: string): Promise<{ roomId: string }> {
            return this.request(`/room-codes/${encodeURIComponent(code)}`)
        }

        uploadRestaurants(roomId: string, restaurants: readonly RestaurantRecord.Document[]): Promise<void> {
            return this.request(`/rooms/${encodeURIComponent(roomId)}/private-restaurants`, 'POST', {restaurants});
        }

        async readRestaurants(roomId: string): Promise<readonly RestaurantRecord.Document[]> {
            const catalog = await this.request<RestaurantRecord.Catalog>(`/rooms/${encodeURIComponent(roomId)}/catalog`);
            this.receiveCatalog?.(roomId, catalog);
            return catalog.restaurants;
        }

        append(batch: EventBatch.Candidate): Promise<EventBatch.Committed> {
            return this.request(`/rooms/${encodeURIComponent(batch.roomId!)}/events`, 'POST', {
                submissionId: batch.submissionId,
                expectedVersion: batch.expectedVersion,
                events: batch.events.map((event, index) => ({
                    ...event,
                    streamVersion: batch.expectedVersion + index + 1
                }))
            })
        }

        async read(roomId: string, afterVersion: number): Promise<{
            batches: EventBatch.Committed[];
            latestVersion: number;
            hasMore: boolean
        }> {
            const history = await this.request<{batches: EventBatch.Committed[]; latestVersion: number; hasMore: boolean;
                catalog?: RestaurantRecord.Catalog}>(`/rooms/${encodeURIComponent(roomId)}/events?afterVersion=${afterVersion}`)
            if (history.catalog) this.receiveCatalog?.(roomId, history.catalog)
            return history
        }

        async subscribe(roomId: string,
                  onHint: (batch?: EventBatch.Committed) => void,
                  onError: (error: Error) => void): Promise<() => void> {
            // Expired rooms must report the HTTP not-found outcome instead of a generic socket error.
            await this.request(`/rooms/${encodeURIComponent(roomId)}/head`)
            return new Promise((resolve, reject) => {
                let acknowledged = false, closed = false
                let heartbeatTimeout: ReturnType<typeof setTimeout> | undefined
                let heartbeatSettings: RoomHeartbeat.Settings | undefined
                const task = uni.connectSocket({
                    url: this.baseUrl.replace(/^http/, 'ws') + `/rooms/${encodeURIComponent(roomId)}/subscribe`,
                    complete: () => {
                    }
                })
                const cleanup = () => { clearTimeout(timer); clearTimeout(heartbeatTimeout) }
                const stop = () => { if (closed) return; closed = true; cleanup(); task.close({}) }
                const fail = (error: Error) => {
                    if (closed) return
                    stop()
                    acknowledged ? onError(error) : reject(error)
                }
                const resetHeartbeat = () => {
                    clearTimeout(heartbeatTimeout)
                    if (heartbeatSettings) heartbeatTimeout = setTimeout(() => fail(new Error('HEARTBEAT_TIMEOUT')), heartbeatSettings.timeoutMs)
                }
                const timer = setTimeout(() => fail(new Error('DISCONNECTED')), 10000)
                task.onMessage(message => {
                    if (closed) return
                    try {
                        const notice = JSON.parse(String(message.data))
                        if (notice.roomId !== roomId) return
                        if (notice.type === 'heartbeat') {
                            if (!acknowledged || !heartbeatSettings || !Number.isSafeInteger(notice.sequence) || notice.sequence < 1) return
                            resetHeartbeat()
                            task.send({data: JSON.stringify({type: 'heartbeatAck', roomId, sequence: notice.sequence}),
                                fail: () => fail(new Error('DISCONNECTED'))})
                            return
                        }
                        if (notice.catalog) this.receiveCatalog?.(roomId, notice.catalog)
                        if (notice.type === 'subscribed') {
                            if (acknowledged) return
                            clearTimeout(timer);
                            if (!Number.isSafeInteger(notice.heartbeat?.intervalMs) || notice.heartbeat.intervalMs <= 0 ||
                                !Number.isSafeInteger(notice.heartbeat?.timeoutMs) || notice.heartbeat.timeoutMs <= notice.heartbeat.intervalMs || !notice.catalog)
                                return fail(new Error('INVALID_ROOM_PROTOCOL'))
                            acknowledged = true;
                            heartbeatSettings = notice.heartbeat
                            resetHeartbeat()
                            resolve(stop)
                        } else if (notice.type !== 'roomCatalogUpdated') {
                            onHint(notice.batch)
                        }
                    } catch (error) {
                        onError(error as Error)
                    }
                })
                task.onError(() => fail(new Error('DISCONNECTED')))
                task.onClose(() => fail(new Error('DISCONNECTED')))
            })
        }

        private request<T>(path: string, method: 'GET' | 'POST' = 'GET', data?: unknown): Promise<T> {
            return new Promise((resolve, reject) => uni.request({
                url: this.baseUrl + path, method, timeout: 10000, data: data as any,
                success: response => {
                    if (response.statusCode >= 200 && response.statusCode < 300) resolve(response.data as T)
                    else if (response.statusCode === 404 && /^Route .+ not found$/.test(String((response.data as {message?: string})?.message || '')))
                        reject(new Error('RELAY_ENDPOINT_UNAVAILABLE'))
                    else if (response.statusCode === 409) reject(new StreamConflictError(response.data as StreamConflictError.Recovery))
                    else reject(new Error([400, 404, 413, 422].includes(response.statusCode) ? `REJECTED_${response.statusCode}` : 'SERVER_OUTCOME_UNKNOWN'))
                }, fail: () => reject(new Error('NETWORK_OUTCOME_UNKNOWN'))
            }))
        }
    }
}
