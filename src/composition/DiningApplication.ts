import {Domain} from '../kernel/domain/Domain';
import type {DiningSessionActions} from '../coordination/application/port/out/DiningSessionActions';
import {Dining} from '../coordination/application/port/in/Dining';
import {LocalDiningData} from '../coordination/application/port/out/LocalDiningData';
import {ListDiningActivitiesUseCase} from '../contexts/accounting/application/port/in/ListDiningActivitiesUseCase';
import {GetConsumptionUseCase} from '../contexts/accounting/application/port/in/GetConsumptionUseCase';
import {ListRestaurantsUseCase} from '../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import {ListRoomsUseCase} from '../contexts/collaboration/application/port/in/ListRoomsUseCase';
import {CreateSingleDiningUseCase} from '../coordination/application/port/in/CreateSingleDiningUseCase';
import {CreateMultiplayerDiningUseCase} from '../coordination/application/port/in/CreateMultiplayerDiningUseCase';
import {JoinMultiplayerDiningUseCase} from '../coordination/application/port/in/JoinMultiplayerDiningUseCase';
import {IncreaseDiningProductUseCase} from '../coordination/application/port/in/IncreaseDiningProductUseCase';
import {DecreaseDiningProductUseCase} from '../coordination/application/port/in/DecreaseDiningProductUseCase';
import {RemoveDiningProductUseCase} from '../coordination/application/port/in/RemoveDiningProductUseCase';
import {ClearDiningRoundUseCase} from '../coordination/application/port/in/ClearDiningRoundUseCase';
import {SubmitDiningRoundUseCase} from '../coordination/application/port/in/SubmitDiningRoundUseCase';
import {ChangeDiningTicketPriceUseCase} from '../coordination/application/port/in/ChangeDiningTicketPriceUseCase';
import {EndDiningUseCase} from '../coordination/application/port/in/EndDiningUseCase';
import {AbandonDiningUseCase} from '../coordination/application/port/in/AbandonDiningUseCase';
import {LeaveDiningRoomUseCase} from '../coordination/application/port/in/LeaveDiningRoomUseCase';
import {TransferDiningHostUseCase} from '../coordination/application/port/in/TransferDiningHostUseCase';
import {SyncRoomRestaurantUseCase} from '../coordination/application/port/in/SyncRoomRestaurantUseCase';
import {InitializeIdentityUseCase} from '../coordination/application/port/in/InitializeIdentityUseCase';
import {ChangeNicknameUseCase} from '../coordination/application/port/in/ChangeNicknameUseCase';
import {SelectDiningSessionUseCase} from '../coordination/application/port/in/SelectDiningSessionUseCase';
import {ClearDiningSessionUseCase} from '../coordination/application/port/in/ClearDiningSessionUseCase';
import {SaveReceiptUseCase} from '../coordination/application/port/in/SaveReceiptUseCase';
import {SaveDiningHistoryUseCase} from '../coordination/application/port/in/SaveDiningHistoryUseCase';
import {DeleteReceiptUseCase} from '../coordination/application/port/in/DeleteReceiptUseCase';
import {DeleteDiningHistoryUseCase} from '../coordination/application/port/in/DeleteDiningHistoryUseCase';
import {PublishRestaurantOriginalUseCase} from '../coordination/application/port/in/PublishRestaurantOriginalUseCase';
import {DeleteRestaurantOriginalUseCase} from '../coordination/application/port/in/DeleteRestaurantOriginalUseCase';
import {GetDiningResultUseCase} from '../coordination/application/port/in/GetDiningResultUseCase';

/** UI-facing adapter: constructs requests and caches detached query DTOs, never owns domain decisions. */
export class DiningApplication implements DiningSessionActions {
    private activities: readonly import('../contexts/accounting/application/port/in/Accounting').Accounting.Activity[] = [];
    private rooms: readonly Dining.Room[] = [];
    private originals: readonly Dining.Restaurant[] = [];
    private menu: readonly Dining.Restaurant[] = [];
    private consumptionViews = new Map<string, import('../contexts/accounting/application/port/in/Accounting').Accounting.Consumption>();

    constructor(private readonly initializeIdentity: InitializeIdentityUseCase,
                private readonly changeNickname: ChangeNicknameUseCase,
                private readonly selectDiningSession: SelectDiningSessionUseCase,
                private readonly createSingleDining: CreateSingleDiningUseCase,
                private readonly createMultiplayerDining: CreateMultiplayerDiningUseCase,
                private readonly joinMultiplayerDining: JoinMultiplayerDiningUseCase,
                private readonly increaseDiningProduct: IncreaseDiningProductUseCase,
                private readonly decreaseDiningProduct: DecreaseDiningProductUseCase,
                private readonly removeDiningProduct: RemoveDiningProductUseCase,
                private readonly clearDiningRound: ClearDiningRoundUseCase,
                private readonly submitDiningRound: SubmitDiningRoundUseCase,
                private readonly changeDiningTicketPrice: ChangeDiningTicketPriceUseCase,
                private readonly getDiningResult: GetDiningResultUseCase,
                private readonly endDining: EndDiningUseCase,
                private readonly abandonDining: AbandonDiningUseCase,
                private readonly leaveDiningRoom: LeaveDiningRoomUseCase,
                private readonly clearDiningSession: ClearDiningSessionUseCase,
                private readonly transferDiningHost: TransferDiningHostUseCase,
                private readonly saveReceiptUseCase: SaveReceiptUseCase,
                private readonly saveDiningHistory: SaveDiningHistoryUseCase,
                private readonly deleteReceiptUseCase: DeleteReceiptUseCase,
                private readonly deleteDiningHistory: DeleteDiningHistoryUseCase,
                private readonly publishRestaurantOriginal: PublishRestaurantOriginalUseCase,
                private readonly deleteRestaurantOriginal: DeleteRestaurantOriginalUseCase,
                private readonly syncRoomRestaurant: SyncRoomRestaurantUseCase,
                private readonly listDiningActivities: ListDiningActivitiesUseCase,
                private readonly getConsumption: GetConsumptionUseCase,
                private readonly listRestaurants: ListRestaurantsUseCase,
                private readonly listRooms: ListRoomsUseCase,
                private readonly data: LocalDiningData,
                private readonly id: () => string,
                private readonly now: () => string) {
        this.refresh();
    }

    refresh(): void {
        const activities = this.listDiningActivities.execute(new ListDiningActivitiesUseCase.Request()).value;
        const rooms = this.listRooms.execute(new ListRoomsUseCase.Request()).value;
        const originals = this.listRestaurants.execute(new ListRestaurantsUseCase.Request('local', true)).value;
        const menu = this.session()?.roomId ? this.listRestaurants.execute(new ListRestaurantsUseCase.Request(this.session()!.roomId!, true)).value : originals;
        const views = new Map<string, import('../contexts/accounting/application/port/in/Accounting').Accounting.Consumption>();
        for (const activity of activities)
            for (const restaurant of [...originals, ...menu]) {
                const c = this.getConsumption.execute(new GetConsumptionUseCase.Request(activity.id, restaurant.id)).value;
                if (c)
                    views.set(c.id, c);
            }
        this.activities = activities;
        this.rooms = rooms;
        this.originals = originals;
        this.menu = menu;
        this.consumptionViews = views;
    }

    identity(): Dining.Identity {
        return this.data.identity()!;
    }

    session(): Dining.Session | undefined {
        return this.data.session();
    }

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
        return this.consumptionViews.get(this.session()?.activityId + '/' + id);
    }

    unfinishedSingle(): Dining.Session | undefined {
        const a = this.activities.find(a => a.mode === 'SINGLE' && a.status === 'ACTIVE');
        return a ? {scopeId: a.id, activityId: a.id, roomId: null} : undefined;
    }

    async initialize() {
        await this.initializeIdentity.execute(new InitializeIdentityUseCase.Request(this.id()));
    }

    async nickname(name: string) {
        await this.changeNickname.execute(new ChangeNicknameUseCase.Request(name));
    }

    async selectSession(s: Dining.Session) {
        await this.selectDiningSession.execute(new SelectDiningSessionUseCase.Request(s));
    }

    async startSingle(total: number, categoryId?: string, replaceActivityId?: string) {
        const s = (await this.createSingleDining.execute(new CreateSingleDiningUseCase.Request(this.id(), total, categoryId, replaceActivityId))).value;
        await this.selectSession(s);
    }

    async createRoom(roomId: string, code: string, total: number, categoryId?: string) {
        const s = (await this.createMultiplayerDining.execute(new CreateMultiplayerDiningUseCase.Request(roomId, code, this.id(), this.identity(), total, categoryId))).value;
        await this.selectSession(s);
    }

    async joinRoom(roomId: string) {
        const s = (await this.joinMultiplayerDining.execute(new JoinMultiplayerDiningUseCase.Request(roomId, this.identity()))).value;
        await this.selectSession(s);
    }

    async edit(restaurantId: string, action: 'add' | 'reduce' | 'remove' | 'clear', productId = '', quantity = 1) {
        const s = this.current(), actor = this.identity().id;
        if (action === 'add')
            await this.increaseDiningProduct.execute(new IncreaseDiningProductUseCase.Request(s, actor, restaurantId, productId, quantity));
        else if (action === 'reduce')
            await this.decreaseDiningProduct.execute(new DecreaseDiningProductUseCase.Request(s, actor, restaurantId, productId, quantity));
        else if (action === 'remove')
            await this.removeDiningProduct.execute(new RemoveDiningProductUseCase.Request(s, actor, restaurantId, productId));
        else
            await this.clearDiningRound.execute(new ClearDiningRoundUseCase.Request(s, actor, restaurantId));
    }

    async submit(id: string) {
        await this.submitDiningRound.execute(new SubmitDiningRoundUseCase.Request(this.current(), this.identity().id, id));
    }

    async paying(total: number) {
        await this.changeDiningTicketPrice.execute(new ChangeDiningTicketPriceUseCase.Request(this.current(), this.identity().id, total));
    }

    preview(id: string): Dining.Result {
        return this.getDiningResult.execute(new GetDiningResultUseCase.Request(this.current(), this.identity(), id, this.now())).value;
    }

    async finish(id: string) {
        await this.endDining.execute(new EndDiningUseCase.Request(this.current(), this.identity(), id));
    }

    async abandon() {
        await this.abandonDining.execute(new AbandonDiningUseCase.Request(this.current(), this.identity().id));
    }

    async leave() {
        await this.leaveDiningRoom.execute(new LeaveDiningRoomUseCase.Request(this.current(), this.identity().id));
        await this.clearDiningSession.execute(new ClearDiningSessionUseCase.Request());
    }

    async transfer(target: string) {
        await this.transferDiningHost.execute(new TransferDiningHostUseCase.Request(this.current(), this.identity().id, target));
    }

    async saveReceipt(id: string) {
        await this.saveReceiptUseCase.execute(new SaveReceiptUseCase.Request(this.preview(id)));
    }

    receipt() {
        return this.data.receipt();
    }

    history() {
        return this.data.history().slice();
    }

    async saveHistory() {
        const result = this.activity()?.result;
        Domain.require(result, 'NO_FINISHED_RESULT');
        await this.saveDiningHistory.execute(new SaveDiningHistoryUseCase.Request(this.current(), result));
    }

    async deleteReceipt() {
        await this.deleteReceiptUseCase.execute(new DeleteReceiptUseCase.Request());
    }

    async deleteHistory(id: string) {
        await this.deleteDiningHistory.execute(new DeleteDiningHistoryUseCase.Request(id));
    }

    async publishLocal(restaurant: Dining.Restaurant) {
        if (!this.identity())
            await this.initialize();
        await this.publishRestaurantOriginal.execute(new PublishRestaurantOriginalUseCase.Request(restaurant, this.identity().id));
    }

    async deleteRestaurant(id: string) {
        await this.deleteRestaurantOriginal.execute(new DeleteRestaurantOriginalUseCase.Request(id, this.identity().id));
    }

    async synchronizePrivate(original: Dining.Restaurant) {
        const s = this.current();
        Domain.require(s.roomId, 'ROOM_REQUIRED');
        await this.syncRoomRestaurant.execute(new SyncRoomRestaurantUseCase.Request(s.roomId, this.identity().id, original));
    }

    private current(): Dining.Session {
        const s = this.session();
        Domain.require(s, 'NO_DINING_SESSION');
        return s;
    }
}
