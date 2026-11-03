import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import {PrismaClient} from '../../generated/client'
import {RoomEventStore} from '../event-store/RoomEventStore'
import {EventBatch} from '../../../protocol/EventBatch'
import {ProductImages} from './ProductImages'
import {RoomHeartbeat} from '../../../protocol/RoomHeartbeat'

export namespace RelayServer {
    export async function create(db = new PrismaClient(), options: {now?: () => Date; heartbeat?: RoomHeartbeat.Settings} = {}) {
        const heartbeatSettings = options.heartbeat || RoomHeartbeat.defaults
        if (!Number.isSafeInteger(heartbeatSettings.intervalMs) || heartbeatSettings.intervalMs <= 0 ||
            !Number.isSafeInteger(heartbeatSettings.timeoutMs) || heartbeatSettings.timeoutMs <= heartbeatSettings.intervalMs) throw new Error('INVALID_HEARTBEAT_SETTINGS')
        const app = Fastify({bodyLimit: 2000000}), store = new RoomEventStore.Store(db, options.now)
        const subscriptions = new Map<string, Set<{ send(data: string): void }>>()
        let presenceQueue: Promise<unknown> = Promise.resolve()
        function presence<T>(work: () => Promise<T>): Promise<T> {
            const result = presenceQueue.then(work)
            presenceQueue = result.catch(error => app.log.error(error))
            return result
        }
        await store.resetConnections()
        await store.removeExpired()
        await app.register(cors, {origin: true, methods: ['GET', 'HEAD', 'POST', 'PUT', 'OPTIONS']});
        await app.register(websocket)
        const catalog = async (roomId: string) => ({restaurants: await store.readRestaurants(roomId),
            images: await ProductImages.manifest(db, roomId)})
        await ProductImages.register(app, db, async roomId => {
            if (!subscriptions.get(roomId)?.size) return
            const notice = JSON.stringify({type: 'roomCatalogUpdated', roomId, catalog: await catalog(roomId)})
            for (const socket of subscriptions.get(roomId) || []) {
                try { socket.send(notice) } catch { /* Reconnect loads the current catalog. */ }
            }
        })
        // Request-time expiry enforces the deadline even between background sweeps.
        app.addHook('onRequest', async request => {
            const room = /^\/rooms\/([^/?]+)/.exec(request.url)
            if (room) await store.requireAvailable(decodeURIComponent(room[1]))
        })
        const cleanup = setInterval(() => { void presence(() => store.removeExpired()) }, 1000)
        cleanup.unref()
        const heartbeat = new Set<{alive: boolean; ping(): void; terminate(): void}>()
        const heartbeatTimer = setInterval(() => {
            for (const peer of heartbeat) {
                if (!peer.alive) peer.terminate()
                else { peer.alive = false; peer.ping() }
            }
        }, 30000)
        heartbeatTimer.unref()
        const applicationHeartbeats = new Set<() => void>()
        const applicationHeartbeatTimer = setInterval(() => {
            for (const pulse of applicationHeartbeats) pulse()
        }, heartbeatSettings.intervalMs)
        applicationHeartbeatTimer.unref()
        app.setErrorHandler((failure, _request, reply) => {
            const error = failure as Error & { statusCode?: number }
            const status = error instanceof RoomEventStore.Conflict ? 409 : error.message === 'STREAM_NOT_FOUND' ? 404
                : /BAD_EVENT|SIZE_LIMIT|INVALID_|INCOMPLETE/.test(error.message) ? 400 : error.statusCode || 500
            reply.code(status).send({
                error: status === 500 ? 'STORAGE_FAILURE' : error.message,
                ...(error instanceof RoomEventStore.Conflict ? {currentVersion: error.currentVersion} : {})
            })
        })
        app.post('/rooms', () => store.create())
        app.post<{Params: {roomId: string}; Body: {restaurants: unknown}}>(
            '/rooms/:roomId/private-restaurants', async (request, reply) => {
                await store.uploadRestaurants(request.params.roomId, request.body?.restaurants);
                return reply.code(204).send();
            })
        app.get<{Params: {roomId: string}}>('/rooms/:roomId/catalog', request => catalog(request.params.roomId))
        app.get<{ Params: { code: string } }>('/room-codes/:code', request => store.locate(request.params.code))
        app.get<{ Params: { roomId: string } }>('/rooms/:roomId/head', async request => ({
            roomId: request.params.roomId,
            version: await store.head(request.params.roomId)
        }))
        app.get<{
            Params: { roomId: string };
            Querystring: { afterVersion?: string; limitBatches?: string }
        }>('/rooms/:roomId/events', async request => {
            const history = await store.read(request.params.roomId, Number(request.query.afterVersion || 0), Number(request.query.limitBatches || 20))
            return history.batches.some(batch => batch.events.some(event => ['RestaurantPublished', 'RestaurantDeleted'].includes(event.type)))
                ? {...history, catalog: await catalog(request.params.roomId)} : history
        })
        app.post<{
            Params: { roomId: string };
            Body: { expectedVersion: number; events: EventBatch.Event[]; submissionId: string }
        }>('/rooms/:roomId/events', async (request, reply) => {
            let batch: EventBatch.Committed
            try { batch = await store.append(request.params.roomId, request.body?.expectedVersion, request.body?.events, request.body?.submissionId) }
            catch (error) {
                if (!(error instanceof RoomEventStore.Conflict)) throw error
                const recovery = await store.read(request.params.roomId, request.body.expectedVersion)
                return reply.code(409).send({error: 'VERSION_CONFLICT', currentVersion: recovery.latestVersion, ...recovery})
            }
            const menu = batch.events.some(event => ['RestaurantPublished', 'RestaurantDeleted'].includes(event.type))
                ? await catalog(request.params.roomId) : undefined
            for (const socket of subscriptions.get(request.params.roomId) || []) {
                try {
                    socket.send(JSON.stringify({
                        type: 'roomBatchesCommitted',
                        roomId: batch.roomId,
                        latestVersion: batch.toVersion,
                        batch,
                        ...(menu ? {catalog: menu} : {})
                    }))
                } catch { /* HTTP history remains authoritative. */
                }
            }
            return batch
        })
        app.get<{ Params: { roomId: string } }>('/rooms/:roomId/subscribe', {websocket: true}, (socket, request) => {
            const roomId = request.params.roomId
            let closed = false
            let sequence = 0, pending: {sequence: number; sentAt: number} | undefined
            const pulse = () => {
                if (closed) return
                if (pending) {
                    if (Date.now() - pending.sentAt >= heartbeatSettings.timeoutMs) socket.terminate()
                    return
                }
                pending = {sequence: ++sequence, sentAt: Date.now()}
                try { socket.send(JSON.stringify({type: 'heartbeat', roomId, sequence})) }
                catch { socket.terminate() }
            }
            socket.on('message', (data: unknown) => {
                if (closed || !pending) return
                try {
                    const notice = JSON.parse(String(data))
                    if (notice.type === 'heartbeatAck' && notice.roomId === roomId && notice.sequence === pending.sequence) pending = undefined
                } catch { /* Application heartbeats cannot modify room events. */ }
            })
            const peer = {alive: true, ping: () => socket.ping(), terminate: () => socket.terminate()}
            heartbeat.add(peer)
            socket.on('pong', () => { peer.alive = true })
            socket.on('close', () => {
                closed = true
                heartbeat.delete(peer)
                applicationHeartbeats.delete(pulse)
                void presence(async () => {
                    const subscribers = subscriptions.get(roomId)
                    subscribers?.delete(socket)
                    if (subscribers && !subscribers.size) {
                        subscriptions.delete(roomId)
                        await store.empty(roomId)
                    }
                })
            })
            void presence(async () => {
                await store.removeExpired()
                if (closed) return
                await store.occupied(roomId)
                const subscribers = subscriptions.get(roomId) || new Set()
                subscribers.add(socket)
                subscriptions.set(roomId, subscribers)
                const currentCatalog = await catalog(roomId)
                if (!closed) {
                    socket.send(JSON.stringify({type: 'subscribed', roomId, catalog: currentCatalog,
                        heartbeat: heartbeatSettings}))
                    applicationHeartbeats.add(pulse); pulse()
                }
            }).catch(() => {
                socket.close(1008, 'STREAM_NOT_FOUND')
            })
        })
        app.addHook('onClose', async () => {
            clearInterval(cleanup)
            clearInterval(heartbeatTimer)
            clearInterval(applicationHeartbeatTimer)
            applicationHeartbeats.clear()
            await presenceQueue
            // Graceful shutdown starts the grace period for remaining connections.
            for (const roomId of subscriptions.keys()) await store.empty(roomId)
            await db.$disconnect()
        })
        return app
    }

    export async function start(): Promise<void> {
        const app = await create()
        await app.listen({port: Number(process.env.PORT || 3001), host: process.env.HOST || '127.0.0.1'})
        console.log('Room event relay listening', app.server.address())
    }
}
