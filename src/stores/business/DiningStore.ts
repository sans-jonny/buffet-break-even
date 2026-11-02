import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {computed, readonly, ref} from 'vue';
import {defineStore, type Pinia} from 'pinia';
import {UniAppUseCaseScope} from '../../composition/UniAppUseCaseScope';
import {QueryClientProvider} from '../../infrastructure/query/QueryClientProvider';
import {Accounting} from '../../contexts/accounting/application/port/in/Accounting';
import {GetPersonalDiningUseCase} from '../../coordination/application/port/in/device/GetPersonalDiningUseCase';
import {Domain} from '../../kernel/domain/Domain';
import {Dining} from '../../coordination/application/dto/Dining';
import {IncreaseDiningProductUseCase} from '../../coordination/application/port/in/dining/IncreaseDiningProductUseCase';
import {DecreaseDiningProductUseCase} from '../../coordination/application/port/in/dining/DecreaseDiningProductUseCase';
import {RemoveDiningProductUseCase} from '../../coordination/application/port/in/dining/RemoveDiningProductUseCase';
import {ClearDiningRoundUseCase} from '../../coordination/application/port/in/dining/ClearDiningRoundUseCase';
import {SubmitDiningRoundUseCase} from '../../coordination/application/port/in/dining/SubmitDiningRoundUseCase';
import {ChangeDiningTicketPriceUseCase} from '../../coordination/application/port/in/dining/ChangeDiningTicketPriceUseCase';
import {EndDiningUseCase} from '../../coordination/application/port/in/dining/EndDiningUseCase';
import {AbandonDiningUseCase} from '../../coordination/application/port/in/dining/AbandonDiningUseCase';
import {TransferDiningHostUseCase} from '../../coordination/application/port/in/room/TransferDiningHostUseCase';
import {SyncRoomRestaurantUseCase} from '../../coordination/application/port/in/catalog/SyncRoomRestaurantUseCase';
import {ChangeNicknameUseCase} from '../../coordination/application/port/in/device/ChangeNicknameUseCase';
import {SaveReceiptUseCase} from '../../coordination/application/port/in/records/SaveReceiptUseCase';
import {SaveDiningHistoryUseCase} from '../../coordination/application/port/in/records/SaveDiningHistoryUseCase';
import {DeleteReceiptUseCase} from '../../coordination/application/port/in/records/DeleteReceiptUseCase';
import {DeleteDiningHistoryUseCase} from '../../coordination/application/port/in/records/DeleteDiningHistoryUseCase';
import {PublishRestaurantOriginalUseCase} from '../../coordination/application/port/in/catalog/PublishRestaurantOriginalUseCase';
import {DeleteRestaurantOriginalUseCase} from '../../coordination/application/port/in/catalog/DeleteRestaurantOriginalUseCase';

/** Coordination business store: commands use injected input ports; reads project QueryClient. */
export class DiningStore {
    constructor(private readonly changeNickname: ChangeNicknameUseCase,
                private readonly increaseDiningProduct: IncreaseDiningProductUseCase,
                private readonly decreaseDiningProduct: DecreaseDiningProductUseCase,
                private readonly removeDiningProduct: RemoveDiningProductUseCase,
                private readonly clearDiningRound: ClearDiningRoundUseCase,
                private readonly submitDiningRound: SubmitDiningRoundUseCase,
                private readonly changeDiningTicketPrice: ChangeDiningTicketPriceUseCase,
                private readonly endDining: EndDiningUseCase,
                private readonly abandonDining: AbandonDiningUseCase,
                private readonly transferDiningHost: TransferDiningHostUseCase,
                private readonly saveReceiptUseCase: SaveReceiptUseCase,
                private readonly saveDiningHistory: SaveDiningHistoryUseCase,
                private readonly deleteReceiptUseCase: DeleteReceiptUseCase,
                private readonly deleteDiningHistory: DeleteDiningHistoryUseCase,
                private readonly publishRestaurantOriginal: PublishRestaurantOriginalUseCase,
                private readonly deleteRestaurantOriginal: DeleteRestaurantOriginalUseCase,
                private readonly syncRoomRestaurant: SyncRoomRestaurantUseCase,
                private readonly queries: QueryClientProvider) {}

    private get activities() { return this.queries.read<readonly Accounting.Activity[]>(['accounting', 'activities']); }
    private get rooms() { return this.queries.read<readonly Dining.Room[]>(['collaboration', 'rooms']); }
    private get originals() { return this.queries.read<readonly Dining.Restaurant[]>(['catalog', 'local']); }
    private get menu() { return this.queries.read<readonly Dining.Restaurant[]>(['catalog', this.session()?.roomId || 'local']); }
    private get personal() { return this.queries.read<GetPersonalDiningUseCase.Response>(['coordination', 'personal']); }
    identity(): Dining.Identity { return this.personal.identity!; }
    session(): Dining.Session | undefined { return this.personal.session; }

    restaurants(): Dining.Restaurant[] {
        const ids = this.activity()?.restaurantIds;
        return this.menu.filter(a => !a.deleted && (!ids || ids.includes(a.id)));
    }

    restaurantCategories(): Readonly<{id: string; name: string}>[] {
        return [...new Map(this.originals.filter(restaurant => !restaurant.deleted)
            .map(restaurant => [restaurant.restaurantCategory.id, restaurant.restaurantCategory])).values()];
    }

    localRestaurants(includeDeleted = false): Dining.Restaurant[] {
        return this.originals.filter(a => includeDeleted || !a.deleted);
    }

    localRestaurant(id: string): Dining.Restaurant {
        const r = this.originals.find(a => a.id === id);
        Domain.require(r, 'RESTAURANT_NOT_FOUND');
        return r;
    }

    activity() {
        return this.activities.find(a => a.id === this.session()?.activityId);
    }

    findRoom(roomId: string): Dining.Room | undefined {
        return this.rooms.find(a => a.id === roomId);
    }

    room() {
        return this.rooms.find(a => a.id === this.session()?.roomId);
    }

    consumption(id: string) {
        const activityId = this.session()?.activityId;
        return activityId ? this.queries.read<{value: Accounting.Consumption | undefined}>(['accounting', 'consumption', activityId, id]).value : undefined;
    }

    unfinishedSingle(): Dining.Session | undefined {
        const a = this.activities.find(a => a.mode === 'SINGLE' && a.status === 'ACTIVE');
        return a ? {scopeId: a.id, activityId: a.id, roomId: null} : undefined;
    }



    async nickname(name: string) {
        return await this.changeNickname.execute(new ChangeNicknameUseCase.Request(name));
    }

    async edit(restaurantId: string, action: 'add' | 'reduce' | 'remove' | 'clear', productId = '', quantity = 1) {
        const s = this.current(), actor = this.identity().id;
        if (action === 'add')
            return await this.increaseDiningProduct.execute(new IncreaseDiningProductUseCase.Request(s, actor, restaurantId, productId, quantity));
        else if (action === 'reduce')
            return await this.decreaseDiningProduct.execute(new DecreaseDiningProductUseCase.Request(s, actor, restaurantId, productId, quantity));
        else if (action === 'remove')
            return await this.removeDiningProduct.execute(new RemoveDiningProductUseCase.Request(s, actor, restaurantId, productId));
        else
            return await this.clearDiningRound.execute(new ClearDiningRoundUseCase.Request(s, actor, restaurantId));
    }

    async submit(id: string) {
        return await this.submitDiningRound.execute(new SubmitDiningRoundUseCase.Request(this.current(), this.identity().id, id));
    }

    async paying(total: number) {
        return await this.changeDiningTicketPrice.execute(new ChangeDiningTicketPriceUseCase.Request(this.current(), this.identity().id, total));
    }

    preview(id: string): Dining.Result {
        return this.queries.read<Dining.Result>(['coordination', 'result', this.current(), this.identity(), id]);
    }

    async finish(id: string) {
        return await this.endDining.execute(new EndDiningUseCase.Request(this.current(), this.identity(), id));
    }

    async abandon() {
        return await this.abandonDining.execute(new AbandonDiningUseCase.Request(this.current(), this.identity().id));
    }

    async transfer(target: string) {
        return await this.transferDiningHost.execute(new TransferDiningHostUseCase.Request(this.current(), this.identity().id, target));
    }

    async saveReceipt(id: string) {
        return await this.saveReceiptUseCase.execute(new SaveReceiptUseCase.Request(this.preview(id)));
    }

    receipt() {
        return this.personal.receipt;
    }

    history() {
        return this.personal.history.slice();
    }

    async saveHistory() {
        const result = this.activity()?.result;
        Domain.require(result, 'NO_FINISHED_RESULT');
        return await this.saveDiningHistory.execute(new SaveDiningHistoryUseCase.Request(this.current(), result));
    }

    async deleteReceipt() {
        return await this.deleteReceiptUseCase.execute(new DeleteReceiptUseCase.Request());
    }

    async deleteHistory(id: string) {
        return await this.deleteDiningHistory.execute(new DeleteDiningHistoryUseCase.Request(id));
    }

    async publishLocal(restaurant: Dining.Restaurant) {
        Domain.require(this.identity(), 'IDENTITY_REQUIRED');
        return await this.publishRestaurantOriginal.execute(new PublishRestaurantOriginalUseCase.Request(restaurant, this.identity().id));
    }

    async deleteRestaurant(id: string) {
        return await this.deleteRestaurantOriginal.execute(new DeleteRestaurantOriginalUseCase.Request(id, this.identity().id));
    }

    async synchronizePrivate(original: Dining.Restaurant) {
        const s = this.current();
        Domain.require(s.roomId, 'ROOM_REQUIRED');
        return await this.syncRoomRestaurant.execute(new SyncRoomRestaurantUseCase.Request(s.roomId, this.identity().id, original));
    }

    private current(): Dining.Session {
        const s = this.session();
        Domain.require(s, 'NO_DINING_SESSION');
        return s;
    }
}

export namespace DiningStore {
    export const token = Symbol('DiningStore') as InjectionToken<ReturnType<typeof create>>;
    export function create(scope: UniAppUseCaseScope, queries: QueryClientProvider, pinia: Pinia) {
        return defineStore('dining', () => {
            const adapter = new DiningStore(scope.resolve(ChangeNicknameUseCase.token),
                scope.resolve(IncreaseDiningProductUseCase.token),
                scope.resolve(DecreaseDiningProductUseCase.token),
                scope.resolve(RemoveDiningProductUseCase.token),
                scope.resolve(ClearDiningRoundUseCase.token),
                scope.resolve(SubmitDiningRoundUseCase.token),
                scope.resolve(ChangeDiningTicketPriceUseCase.token),
                scope.resolve(EndDiningUseCase.token),
                scope.resolve(AbandonDiningUseCase.token),
                scope.resolve(TransferDiningHostUseCase.token),
                scope.resolve(SaveReceiptUseCase.token),
                scope.resolve(SaveDiningHistoryUseCase.token),
                scope.resolve(DeleteReceiptUseCase.token),
                scope.resolve(DeleteDiningHistoryUseCase.token),
                scope.resolve(PublishRestaurantOriginalUseCase.token),
                scope.resolve(DeleteRestaurantOriginalUseCase.token),
                scope.resolve(SyncRoomRestaurantUseCase.token), queries);
            const pending = ref(0), error = ref<unknown>(null);
            async function command<T>(work: () => Promise<T>): Promise<T> {
                pending.value++;
                error.value = null;
                const release = queries.acquire();
                try { const response = await work(); await queries.settled(); return response; }
                catch (failure) { error.value = failure; throw failure; }
                finally { pending.value--; release(); }
            }
            return {
                loading: computed(() => pending.value > 0 || queries.fetching.value),
                error: computed(() => error.value ?? queries.error.value),
                identityData: computed(() => adapter.identity()), sessionData: computed(() => adapter.session()),
                restaurantsData: computed(() => readonly(adapter.restaurants())), activityData: computed(() => adapter.activity()),
                roomData: computed(() => adapter.room()), historyData: computed(() => readonly(adapter.history())),
                receiptData: computed(() => adapter.receipt()),
                identity: adapter.identity.bind(adapter),
                session: adapter.session.bind(adapter),
                restaurants: adapter.restaurants.bind(adapter),
                restaurantCategories: adapter.restaurantCategories.bind(adapter),
                localRestaurants: adapter.localRestaurants.bind(adapter),
                localRestaurant: adapter.localRestaurant.bind(adapter),
                activity: adapter.activity.bind(adapter),
                findRoom: adapter.findRoom.bind(adapter),
                room: adapter.room.bind(adapter),
                consumption: adapter.consumption.bind(adapter),
                unfinishedSingle: adapter.unfinishedSingle.bind(adapter),
                nickname: (...args: Parameters<DiningStore['nickname']>) => command(() => adapter.nickname(...args)),
                edit: (...args: Parameters<DiningStore['edit']>) => command(() => adapter.edit(...args)),
                submit: (...args: Parameters<DiningStore['submit']>) => command(() => adapter.submit(...args)),
                paying: (...args: Parameters<DiningStore['paying']>) => command(() => adapter.paying(...args)),
                preview: adapter.preview.bind(adapter),
                finish: (...args: Parameters<DiningStore['finish']>) => command(() => adapter.finish(...args)),
                abandon: (...args: Parameters<DiningStore['abandon']>) => command(() => adapter.abandon(...args)),
                transfer: (...args: Parameters<DiningStore['transfer']>) => command(() => adapter.transfer(...args)),
                saveReceipt: (...args: Parameters<DiningStore['saveReceipt']>) => command(() => adapter.saveReceipt(...args)),
                receipt: adapter.receipt.bind(adapter),
                history: adapter.history.bind(adapter),
                saveHistory: (...args: Parameters<DiningStore['saveHistory']>) => command(() => adapter.saveHistory(...args)),
                deleteReceipt: (...args: Parameters<DiningStore['deleteReceipt']>) => command(() => adapter.deleteReceipt(...args)),
                deleteHistory: (...args: Parameters<DiningStore['deleteHistory']>) => command(() => adapter.deleteHistory(...args)),
                publishLocal: (...args: Parameters<DiningStore['publishLocal']>) => command(() => adapter.publishLocal(...args)),
                deleteRestaurant: (...args: Parameters<DiningStore['deleteRestaurant']>) => command(() => adapter.deleteRestaurant(...args)),
                synchronizePrivate: (...args: Parameters<DiningStore['synchronizePrivate']>) => command(() => adapter.synchronizePrivate(...args)),
            };
        })(pinia);
    }
}
