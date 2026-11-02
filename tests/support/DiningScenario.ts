import type {RestaurantRecord} from '../../protocol/RestaurantRecord';
import assert from 'node:assert/strict'
import {Buffet} from '../../src/composition/Buffet'
import {Dining} from '../../src/coordination/application/dto/Dining'
import {EventBatch} from '../../protocol/EventBatch'
import {ManifestStorage} from '../../src/infrastructure/storage/ManifestStorage'
import {BatchRuntime} from '../../src/infrastructure/projection/BatchRuntime'
import {InitializeDiningUseCase} from '../../src/coordination/application/port/in/initialization/InitializeDiningUseCase'
import {StartSingleDiningUseCase} from '../../src/coordination/application/port/in/session/StartSingleDiningUseCase'
import {JoinDiningRoomUseCase} from '../../src/coordination/application/port/in/session/JoinDiningRoomUseCase'
import {LeaveDiningSessionUseCase} from '../../src/coordination/application/port/in/session/LeaveDiningSessionUseCase'
import {CreateMultiplayerDiningUseCase} from '../../src/coordination/application/port/in/dining/CreateMultiplayerDiningUseCase'
import {SelectDiningSessionUseCase} from '../../src/coordination/application/port/in/device/SelectDiningSessionUseCase'
import {RoomConnection} from '../../src/coordination/application/port/out/session/RoomConnection'
import {RoomGateway} from '../../src/coordination/application/port/out/session/RoomGateway'
import {DiningPreferences} from '../../src/coordination/application/port/out/session/DiningPreferences'
import {StorageDiningPreferences} from '../../src/infrastructure/storage/StorageDiningPreferences'
import {CoordinationComposition} from '../../src/coordination/composition/CoordinationComposition'

/** Reusable business vocabulary for specifications, never imported by production. */
export namespace DiningScenario {
    export function configureSessions(app: ReturnType<typeof Buffet.create>, id: () => string): void {
        app.provide(RoomConnection.token, {watch: roomId => app.runtime.synchronize(roomId), stop: () => {},
            acknowledge: roomId => app.runtime.acknowledgeUnknown(roomId)});
        app.provide(RoomGateway.token, {create: async () => ({roomId: 'room', code: '123456'}), locate: async code => ({roomId: code})});
        app.provide(DiningPreferences.token, new StorageDiningPreferences(app.runtime));
        CoordinationComposition.registerSessions(app, id);
    }
    export class Storage implements ManifestStorage.Adapter {
        readonly values = new Map<string, string>()
        fail?: (key: string) => boolean

        get(key: string): string | undefined {
            return this.values.get(key) ?? this.values.get('buffet:v3:'+key)
        }

        set(key: string, value: string): void {
            if (this.fail?.(key.replace(/^buffet:v3:/,''))) throw new Error('DISK_FULL');
            this.values.set(key, value)
        }

        remove(key: string): void {
            this.values.delete(key)
        }

        keys(): readonly string[] {
            return [...this.values.keys()]
        }
    }

    export class Relay implements BatchRuntime.Remote {
        readonly streams = new Map<string, EventBatch.Committed[]>()
        readonly catalogs = new Map<string, readonly RestaurantRecord.Document[]>();
        async uploadRestaurants(roomId: string, records: readonly RestaurantRecord.Document[]): Promise<void> {
            const previous = this.catalogs.get(roomId);
            if (previous && JSON.stringify(previous) !== JSON.stringify(records)) throw new Error('INVALID_CATALOG_REPLACEMENT');
            this.catalogs.set(roomId, JSON.parse(JSON.stringify(records)));
        }
        async readRestaurants(roomId: string): Promise<readonly RestaurantRecord.Document[]> {
            return JSON.parse(JSON.stringify(this.catalogs.get(roomId) || []));
        }
        sent = 0
        beforeAppend?: () => Promise<void>
        loseResponse = false

        async append(candidate: EventBatch.Candidate): Promise<EventBatch.Committed> {
            this.sent++
            const hook = this.beforeAppend;
            this.beforeAppend = undefined;
            if (hook) await hook()
            const batches = this.streams.get(candidate.roomId!) || []
            if ((batches[batches.length - 1]?.toVersion || 0) !== candidate.expectedVersion) throw new Error('VERSION_CONFLICT')
            const batch = EventBatch.commit(candidate, `batch-${this.sent}`)
            batches.push(batch);
            this.streams.set(candidate.roomId!, batches)
            if (this.loseResponse) throw new Error('NETWORK_TIMEOUT')
            return batch
        }

        async read(roomId: string, afterVersion: number) {
            const batches = this.streams.get(roomId) || []
            return {
                batches: batches.filter(b => b.toVersion > afterVersion),
                latestVersion: batches[batches.length - 1]?.toVersion || 0,
                hasMore: false
            }
        }
    }

    export const restaurant = (changes: Partial<Dining.Restaurant> = {}): Dining.Restaurant => ({
        id: 'buffet',
        name: '同名餐厅',
        type: 'PRIVATE',
        restaurantCategory: {id: 'My', name: '我的餐厅'},
        version: 1,
        deleted: false,
        categories: [{id: 'seafood', name: '海鲜'}],
        products: [{id: 'shrimp', name: '虾', categoryId: 'seafood', priceMinor: 1500}], ...changes
    })

    export class Meal {
        readonly storage = new Storage()
        readonly app: ReturnType<typeof Buffet.create>
        readonly dining: ReturnType<typeof Buffet.create>['dining']
        private sequence = 0
        readonly id = () => `${this.device}-${++this.sequence}`

        constructor(readonly relay = new Relay(), readonly device = 'one', withSessionPorts = true, media?: Buffet.Options['media']) {
            this.app = Buffet.create({
                storage: this.storage,
                id: this.id,
                now: () => '2026-11-01T04:00:00.000Z',
                remote: relay, media
            })
            this.dining = this.app.dining
            if (withSessionPorts) configureSessions(this.app, this.id)
        }

        async givenRestaurant(changes: Partial<Dining.Restaurant> = {}): Promise<this> {
            await this.initialize();
            await this.app.catalog.publish(restaurant(changes));
            return this
        }

        async givenSingle(total = 20000): Promise<this> {
            await this.initialize();
            await this.startSingle(total);
            return this
        }

        async givenRoom(roomId = 'room'): Promise<this> {
            await this.initialize();
            await this.createRoom(roomId, '123456', 20000);
            return this
        }

        async whenEating(quantity = 1, restaurantId = 'buffet', productId = 'shrimp'): Promise<this> {
            await this.dining.edit(restaurantId, 'add', productId, quantity);
            return this
        }

        async initialize(): Promise<void> {
            await this.app.resolve(InitializeDiningUseCase.token).execute(new InitializeDiningUseCase.Request());
        }

        startSingle(total: number, categoryId?: string, replaceActivityId?: string) {
            return this.app.resolve(StartSingleDiningUseCase.token).execute(new StartSingleDiningUseCase.Request(total, categoryId, replaceActivityId));
        }

        selectSession(session: Dining.Session) {
            return this.app.resolve(SelectDiningSessionUseCase.token).execute(new SelectDiningSessionUseCase.Request(session));
        }

        async createRoom(roomId: string, code: string, total: number, categoryId?: string) {
            const response = await this.app.resolve(CreateMultiplayerDiningUseCase.token).execute(
                new CreateMultiplayerDiningUseCase.Request(roomId, code, this.id(), this.dining.identity(), total, categoryId));
            await this.selectSession(response.value);
            return response;
        }

        joinRoom(roomId: string) {
            return this.app.resolve(JoinDiningRoomUseCase.token).execute(new JoinDiningRoomUseCase.Request(roomId));
        }

        leave() {
            return this.app.resolve(LeaveDiningSessionUseCase.token).execute(new LeaveDiningSessionUseCase.Request());
        }

        async whenSubmitting(restaurantId = 'buffet'): Promise<this> {
            await this.dining.submit(restaurantId);
            return this
        }

        thenValueIs(minor: number, restaurantId = 'buffet'): this {
            assert.equal(this.dining.preview(restaurantId).foodValueMinor, minor);
            return this
        }

        thenQuantityIs(quantity: number, restaurantId = 'buffet', productId = 'shrimp'): this {
            assert.equal(this.dining.consumption(restaurantId)?.rounds.reduce((sum,
                                                                               r) => sum + (r.items[productId] || 0), 0) || 0, quantity);
            return this
        }
    }
}
