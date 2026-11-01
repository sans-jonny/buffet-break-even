import {randomUUID} from 'node:crypto'
import {PrismaClient} from '../../generated/client'
import {EventBatch} from '../../../protocol/EventBatch'
import {RestaurantRecord} from '../../../protocol/RestaurantRecord'

export namespace RoomEventStore {
    export class Conflict extends Error {
        constructor(readonly currentVersion: number) {
            super('VERSION_CONFLICT')
        }
    }

    export class Store {
        constructor(private readonly db: PrismaClient) {
        }

        async create(): Promise<{ roomId: string; code: string }> {
            for (let attempt = 0; attempt < 16; attempt++) {
                const roomId = randomUUID(), code = String(Math.floor(100000 + Math.random() * 900000))
                try {
                    await this.db.roomStream.create({data: {roomId, code}});
                    return {roomId, code}
                } catch (error) {
                    if ((error as { code?: string }).code !== 'P2002') throw error
                }
            }
            throw new Error('ROOM_CODE_CAPACITY')
        }

        async locate(code: string): Promise<{ roomId: string; code: string; version: number }> {
            const stream = await this.db.roomStream.findUnique({where: {code}})
            if (!stream) throw new Error('STREAM_NOT_FOUND');
            return {roomId: stream.roomId, code: stream.code, version: stream.version}
        }

        async head(roomId: string): Promise<number> {
            const stream = await this.db.roomStream.findUnique({where: {roomId}})
            if (!stream) throw new Error('STREAM_NOT_FOUND');
            return stream.version
        }

        async uploadRestaurants(roomId: string, records: unknown): Promise<void> {
            RestaurantRecord.validate(records);
            const document = JSON.stringify(records);
            const updated = await this.db.roomStream.updateMany({
                where: {roomId, version: 0, catalogDocument: null}, data: {catalogDocument: document}
            });
            if (updated.count) return;
            const stream = await this.db.roomStream.findUnique({where: {roomId}});
            if (!stream) throw new Error('STREAM_NOT_FOUND');
            if (stream.catalogDocument !== document) throw new Error('INVALID_CATALOG_REPLACEMENT');
        }

        async readRestaurants(roomId: string): Promise<readonly RestaurantRecord.Document[]> {
            const stream = await this.db.roomStream.findUnique({where: {roomId}});
            if (!stream) throw new Error('STREAM_NOT_FOUND');
            return stream.catalogDocument ? JSON.parse(stream.catalogDocument) : [];
        }

        async append(roomId: string,
                     expectedVersion: number,
                     events: readonly EventBatch.Event[]): Promise<EventBatch.Committed> {
            EventBatch.validate(events)
            const batch = EventBatch.commit({roomId, scopeId: roomId, expectedVersion, events}, randomUUID())
            if (batch.toVersion > 100000) throw new Error('SIZE_LIMIT')
            return this.db.$transaction(async tx => {
                const updated = await tx.roomStream.updateMany({
                    where: {roomId, version: expectedVersion},
                    data: {version: batch.toVersion}
                })
                if (updated.count !== 1) {
                    const stream = await tx.roomStream.findUnique({where: {roomId}})
                    if (!stream) throw new Error('STREAM_NOT_FOUND')
                    throw new Conflict(stream.version)
                }
                await tx.roomBatch.create({
                    data: {
                        batchId: batch.batchId, roomId, previousVersion: expectedVersion,
                        fromVersion: batch.fromVersion, toVersion: batch.toVersion, document: JSON.stringify(batch)
                    }
                })
                for (const event of batch.events) await tx.roomEvent.create({
                    data: {
                        roomId, version: event.version,
                        batchId: batch.batchId, batchIndex: event.batchIndex, document: JSON.stringify(event)
                    }
                })
                return batch
            })
        }

        async read(roomId: string, afterVersion = 0, limitBatches = 20): Promise<{
            batches: EventBatch.Committed[];
            latestVersion: number;
            hasMore: boolean
        }> {
            if (!Number.isSafeInteger(afterVersion) || afterVersion < 0 || !Number.isSafeInteger(limitBatches) || limitBatches < 1 || limitBatches > 100) throw new Error('INVALID_PAGINATION')
            return this.db.$transaction(async tx => {
                const stream = await tx.roomStream.findUnique({where: {roomId}})
                if (!stream) throw new Error('STREAM_NOT_FOUND')
                const rows = await tx.roomBatch.findMany({
                    where: {roomId, toVersion: {gt: afterVersion}},
                    orderBy: {fromVersion: 'asc'},
                    take: limitBatches
                })
                if (rows[0] && rows[0].previousVersion !== afterVersion) throw new Error('INVALID_BATCH_BOUNDARY')
                const batches = rows.map(row => JSON.parse(row.document) as EventBatch.Committed)
                return {
                    batches,
                    latestVersion: stream.version,
                    hasMore: (batches[batches.length - 1]?.toVersion ?? afterVersion) < stream.version
                }
            })
        }
    }
}
