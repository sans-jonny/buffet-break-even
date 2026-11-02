import type {RoomConnection} from '../../coordination/application/port/out/session/RoomConnection';
import type {RoomSubscription} from '../../kernel/application/RoomSubscription';
import type {RoomSynchronizer} from '../../kernel/application/RoomSynchronizer';
import type {CommittedBatchProjector} from '../../kernel/application/CommittedBatchProjector';

/** Owns transport lifetime and recovery, without making dining decisions. */
export class ManagedRoomConnection implements RoomConnection {
    private current?: {roomId: string; ready: Promise<void>; stop?: () => void; timer?: ReturnType<typeof setInterval>};
    private suspended = false;

    constructor(private readonly subscription: RoomSubscription,
                private readonly synchronizer: RoomSynchronizer,
                private readonly projector: CommittedBatchProjector,
                private readonly report: (error: unknown) => void,
                private readonly refreshMedia?: (roomId: string) => Promise<void>) {}

    watch(roomId: string): Promise<void> {
        if (this.suspended) return Promise.reject(new Error('ROOM_CONNECTION_CANCELLED'));
        if (this.current?.roomId === roomId) return this.current.ready;
        this.stop();
        const connection: NonNullable<ManagedRoomConnection['current']> = {roomId, ready: Promise.resolve()};
        this.current = connection;
        connection.ready = (async () => {
            try {
                const stop = await this.subscription.subscribe(roomId, batch => {
                    if (this.current !== connection) return;
                    const received = batch ? this.projector.projectCommitted(batch).catch(error => {
                        if ((error as Error).message === 'EVENT_GAP') return this.synchronizer.synchronize(roomId);
                        throw error;
                    }) : this.synchronizer.synchronize(roomId);
                    void received.then(() => this.current === connection ? this.refreshMedia?.(roomId) : undefined).catch(this.report);
                }, error => { if (this.current === connection) this.report(error); });
                if (this.current !== connection) {
                    stop();
                    throw new Error('ROOM_CONNECTION_CANCELLED');
                }
                connection.stop = stop;
                await this.synchronizer.synchronize(roomId);
                if (this.current === connection) await this.refreshMedia?.(roomId).catch(this.report);
                if (this.current !== connection) throw new Error('ROOM_CONNECTION_CANCELLED');
                connection.timer = setInterval(() => {
                    void this.synchronizer.synchronize(roomId)
                        .then(() => this.current === connection ? this.refreshMedia?.(roomId) : undefined).catch(this.report);
                }, 5000);
            } catch (error) {
                if (this.current === connection) this.stop();
                throw error;
            }
        })();
        return connection.ready;
    }

    stop(): void {
        const connection = this.current;
        this.current = undefined;
        if (connection?.timer) clearInterval(connection.timer);
        connection?.stop?.();
    }

    suspend(): void {
        this.suspended = true;
        this.stop();
    }

    resume(): void {
        this.suspended = false;
    }

    acknowledge(roomId: string): Promise<void> {
        return this.synchronizer.acknowledgeUnknown(roomId);
    }
}
