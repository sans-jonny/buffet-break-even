import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import {PrismaClient} from '../../generated/client'
import {RoomEventStore} from '../event-store/RoomEventStore'
import {EventBatch} from '../../../protocol/EventBatch'
import {ProductImages} from './ProductImages'

export namespace RelayServer {
    export async function create(db = new PrismaClient(), options: {now?: () => Date; legacyImageDirectory?: string} = {}) {
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
        await app.register(cors, {origin: true});
        await app.register(websocket)
        await ProductImages.register(app, db, options.legacyImageDirectory)
        // Request-time expiry enforces the deadline even between background sweeps.
        app.addHook('onRequest', async () => { await presence(() => store.removeExpired()) })
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
        app.get<{Params: {roomId: string}}>('/rooms/:roomId/private-restaurants', request =>
            store.readRestaurants(request.params.roomId))
        app.get<{ Params: { code: string } }>('/room-codes/:code', request => store.locate(request.params.code))
        app.get<{ Params: { roomId: string } }>('/rooms/:roomId/head', async request => ({
            roomId: request.params.roomId,
            version: await store.head(request.params.roomId)
        }))
        app.get<{
            Params: { roomId: string };
            Querystring: { afterVersion?: string; limitBatches?: string }
        }>('/rooms/:roomId/events', request =>
            store.read(request.params.roomId, Number(request.query.afterVersion || 0), Number(request.query.limitBatches || 20)))
        app.post<{
            Params: { roomId: string };
            Body: { expectedVersion: number; events: EventBatch.Event[] }
        }>('/rooms/:roomId/events', async (request, reply) => {
            let batch: EventBatch.Committed
            try { batch = await store.append(request.params.roomId, request.body?.expectedVersion, request.body?.events) }
            catch (error) {
                if (!(error instanceof RoomEventStore.Conflict)) throw error
                const recovery = await store.read(request.params.roomId, request.body.expectedVersion)
                return reply.code(409).send({error: 'VERSION_CONFLICT', currentVersion: recovery.latestVersion, ...recovery})
            }
            for (const socket of subscriptions.get(request.params.roomId) || []) {
                try {
                    socket.send(JSON.stringify({
                        type: 'roomBatchesCommitted',
                        roomId: batch.roomId,
                        latestVersion: batch.toVersion,
                        batch
                    }))
                } catch { /* HTTP history remains authoritative. */
                }
            }
            return batch
        })
        app.get<{ Params: { roomId: string } }>('/rooms/:roomId/subscribe', {websocket: true}, (socket, request) => {
            const roomId = request.params.roomId
            let closed = false
            const peer = {alive: true, ping: () => socket.ping(), terminate: () => socket.terminate()}
            heartbeat.add(peer)
            socket.on('pong', () => { peer.alive = true })
            socket.on('close', () => {
                closed = true
                heartbeat.delete(peer)
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
                if (!closed) socket.send(JSON.stringify({type: 'subscribed', roomId}))
            }).catch(() => {
                socket.close(1008, 'STREAM_NOT_FOUND')
            })
        })
        app.addHook('onClose', async () => {
            clearInterval(cleanup)
            clearInterval(heartbeatTimer)
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
