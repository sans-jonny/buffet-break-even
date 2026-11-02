import type {RestaurantRecord} from '../../../protocol/RestaurantRecord';
import {StreamConflictError} from '../../kernel/application/StreamConflictError'
import {EventBatch} from '../../../protocol/EventBatch'
import {BatchRuntime} from '../projection/BatchRuntime'

export namespace UniRoomRelay {
    export class Client implements BatchRuntime.Remote {
        constructor(private readonly baseUrl: string) {
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

        readRestaurants(roomId: string): Promise<readonly RestaurantRecord.Document[]> {
            return this.request(`/rooms/${encodeURIComponent(roomId)}/private-restaurants`);
        }

        append(batch: EventBatch.Candidate): Promise<EventBatch.Committed> {
            return this.request(`/rooms/${encodeURIComponent(batch.roomId!)}/events`, 'POST', {
                expectedVersion: batch.expectedVersion,
                events: batch.events.map((event, index) => ({
                    ...event,
                    streamVersion: batch.expectedVersion + index + 1
                }))
            })
        }

        read(roomId: string, afterVersion: number): Promise<{
            batches: EventBatch.Committed[];
            latestVersion: number;
            hasMore: boolean
        }> {
            return this.request(`/rooms/${encodeURIComponent(roomId)}/events?afterVersion=${afterVersion}`)
        }

        async subscribe(roomId: string,
                  onHint: (batch?: EventBatch.Committed) => void,
                  onError: (error: Error) => void): Promise<() => void> {
            // Expired rooms must report the HTTP not-found outcome instead of a generic socket error.
            await this.request(`/rooms/${encodeURIComponent(roomId)}/head`)
            return new Promise((resolve, reject) => {
                let acknowledged = false
                const task = uni.connectSocket({
                    url: this.baseUrl.replace(/^http/, 'ws') + `/rooms/${encodeURIComponent(roomId)}/subscribe`,
                    complete: () => {
                    }
                })
                const timer = setTimeout(() => {
                    if (!acknowledged) {
                        reject(new Error('DISCONNECTED'));
                        task.close({})
                    }
                }, 10000)
                task.onMessage(message => {
                    try {
                        const notice = JSON.parse(String(message.data))
                        if (notice.roomId !== roomId) return
                        if (notice.type === 'subscribed') {
                            clearTimeout(timer);
                            acknowledged = true;
                            resolve(() => {
                                task.close({})
                            })
                        } else onHint(notice.batch)
                    } catch (error) {
                        onError(error as Error)
                    }
                })
                task.onError(() => {
                    clearTimeout(timer);
                    const error = new Error('DISCONNECTED');
                    acknowledged ? onError(error) : reject(error)
                })
                task.onClose(() => {
                    clearTimeout(timer);
                    if (acknowledged) onError(new Error('DISCONNECTED')); else reject(new Error('DISCONNECTED'))
                })
            })
        }

        private request<T>(path: string, method: 'GET' | 'POST' = 'GET', data?: unknown): Promise<T> {
            return new Promise((resolve, reject) => uni.request({
                url: this.baseUrl + path, method, timeout: 10000, data: data as any,
                success: response => {
                    if (response.statusCode >= 200 && response.statusCode < 300) resolve(response.data as T)
                    else if (response.statusCode === 409) reject(new StreamConflictError(response.data as StreamConflictError.Recovery))
                    else reject(new Error([400, 404, 413, 422].includes(response.statusCode) ? `REJECTED_${response.statusCode}` : 'SERVER_OUTCOME_UNKNOWN'))
                }, fail: () => reject(new Error('NETWORK_OUTCOME_UNKNOWN'))
            }))
        }
    }
}
