import type {Dining} from '../port/in/Dining';
import type {DiningSessions} from '../port/in/DiningSessions';
import type {DiningSessionActions} from '../port/out/DiningSessionActions';
import type {DiningPreferences} from '../port/out/DiningPreferences';
import type {RoomGateway} from '../port/out/RoomGateway';
import type {RoomConnection} from '../port/out/RoomConnection';
import {UseCase} from '../../../kernel/application/UseCase';
import {InvalidRequestError} from '../../../kernel/application/InvalidRequestError';

/** Device workflow spans remote and local commits; it is deliberately not one transaction. */
export class DiningSessionWorkflow implements DiningSessions {
    constructor(private readonly dining: DiningSessionActions,
                private readonly preferences: DiningPreferences,
                private readonly rooms: RoomGateway,
                private readonly connection: RoomConnection,
                private readonly referenceCatalog: readonly Dining.Restaurant[]) {}

    async initialize(): Promise<void> {
        await this.dining.initialize();
        // Include deleted originals: an intentionally emptied catalog must not be reseeded.
        if (!this.dining.localRestaurants(true).length) {
            for (const restaurant of this.referenceCatalog) await this.dining.publishLocal(restaurant);
        }
    }

    async createRoom(total: number, categoryId: string): Promise<void> {
        UseCase.id(categoryId);
        UseCase.amount(total, true);
        if (categoryId && !this.dining.localRestaurants().some(restaurant => restaurant.restaurantCategory.id === categoryId))
            throw new InvalidRequestError('RESTAURANT_CATEGORY_EMPTY');
        const room = await this.rooms.create();
        // Keep the allocated room recoverable even if its business initialization fails.
        await this.preferences.rememberRoom(room.roomId);
        try {
            await this.connection.watch(room.roomId);
            await this.dining.createRoom(room.roomId, room.code, total, categoryId);
        } catch (error) {
            this.releaseFailedConnection(error);
            throw error;
        }
    }

    async joinRoom(code?: string): Promise<void> {
        const roomId = code ? (await this.rooms.locate(code)).roomId : this.preferences.lastRoom();
        if (!roomId) throw new InvalidRequestError('没有上次房间');
        try {
            await this.connection.watch(roomId);
            const room = this.dining.findRoom(roomId);
            if (room?.members.some(member => member.id === this.dining.identity().id && member.present && member.online))
                await this.dining.selectSession({scopeId: roomId, roomId, activityId: room.activityId});
            else await this.dining.joinRoom(roomId);
        } catch (error) {
            this.releaseFailedConnection(error);
            throw error;
        }
    }

    async refresh(): Promise<void> {
        const roomId = this.dining.session()?.roomId;
        if (roomId) await this.connection.watch(roomId);
    }

    async leaveRoom(): Promise<void> {
        await this.dining.leave();
        this.connection.stop();
    }

    async acknowledgeSubmission(): Promise<void> {
        const roomId = this.dining.session()?.roomId;
        if (roomId) await this.connection.acknowledge(roomId);
    }

    private releaseFailedConnection(error: unknown): void {
        // These outcomes still need background catch-up; never resend their write command.
        const code = (error as Error)?.message;
        if (code !== 'UNKNOWN_COMMIT_OUTCOME' && code !== 'SYNC_PENDING') this.connection.stop();
    }
}
