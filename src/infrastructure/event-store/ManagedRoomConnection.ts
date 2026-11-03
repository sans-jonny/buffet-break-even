import type {RoomConnection} from '../../coordination/application/port/out/session/RoomConnection';
import type {RoomSubscription} from '../../kernel/application/RoomSubscription';
import type {RoomSynchronizer} from '../../kernel/application/RoomSynchronizer';
import type {CommittedBatchProjector} from '../../kernel/application/CommittedBatchProjector';

/** Owns transport lifetime and recovery, without making dining decisions. */
export class ManagedRoomConnection implements RoomConnection {
    private current?: {roomId: string; ready: Promise<void>; stop?: () => void; timer?: ReturnType<typeof setInterval>;
        retry?: ReturnType<typeof setTimeout>; attempts: number; epoch: number; reported: boolean;
        recovery?: {resolve(): void; reject(error: Error): void}};
    private suspended = false;

    constructor(private readonly subscription: RoomSubscription,
                private readonly synchronizer: RoomSynchronizer,
                private readonly projector: CommittedBatchProjector,
                private readonly report: (error: unknown) => void,
                private readonly unconfirmed?: (roomId: string) => boolean) {}

    hasUnconfirmed(roomId: string): boolean { return this.unconfirmed?.(roomId) || false; }

    watch(roomId: string): Promise<void> {
        if (this.suspended) return Promise.reject(new Error('ROOM_CONNECTION_CANCELLED'));
        if (this.current?.roomId === roomId) return this.current.ready;
        this.stop();
        const connection: NonNullable<ManagedRoomConnection['current']> = {roomId, ready: Promise.resolve(), attempts: 0, epoch: 0, reported: false};
        this.current = connection;
        connection.ready = this.connect(connection).catch(error => {
            if (this.current === connection) this.stop();
            throw error;
        });
        return connection.ready;
    }

    private async connect(connection: NonNullable<ManagedRoomConnection['current']>): Promise<void> {
        const {roomId} = connection, epoch = ++connection.epoch;
        let established = false, openingFailure: Error | undefined;
        const active = () => this.current === connection && connection.epoch === epoch;
        const stop = await this.subscription.subscribe(roomId, batch => {
            if (!active()) return;
            const received = batch ? this.projector.projectCommitted(batch).catch(error => {
                if ((error as Error).message === 'EVENT_GAP') return this.synchronizer.synchronize(roomId);
                throw error;
            }) : this.synchronizer.synchronize(roomId);
            void received.catch(this.report);
        }, error => {
            if (!active()) return;
            if (established) this.reconnect(connection, error);
            else openingFailure = error;
        });
        if (!active() || openingFailure) {
            stop();
            throw openingFailure || new Error('ROOM_CONNECTION_CANCELLED');
        }
        connection.stop = stop;
        await this.synchronizer.synchronize(roomId);
        if (!active() || openingFailure) throw openingFailure || new Error('ROOM_CONNECTION_CANCELLED');
        established = true;
        connection.attempts = 0;
        connection.reported = false;
        connection.timer = setInterval(() => {
            if (active()) void this.synchronizer.synchronize(roomId).catch(this.report);
        }, 5000);
    }

    private reconnect(connection: NonNullable<ManagedRoomConnection['current']>, error: Error): void {
        if (this.current !== connection) return;
        if (!connection.reported) { connection.reported = true; this.report(error); }
        if (error.message === 'REJECTED_404') {
            connection.recovery?.reject(error);
            connection.recovery = undefined;
            this.stop();
            return;
        }
        if (!connection.recovery) {
            connection.ready = new Promise<void>((resolve, reject) => { connection.recovery = {resolve, reject}; });
            void connection.ready.catch(() => {});
        }
        connection.epoch++;
        if (connection.timer) clearInterval(connection.timer);
        if (connection.retry) clearTimeout(connection.retry);
        const close = connection.stop;
        connection.stop = undefined;
        close?.();
        connection.retry = setTimeout(() => {
            connection.retry = undefined;
            if (this.current !== connection) return;
            void this.connect(connection).then(() => {
                connection.recovery?.resolve();
                connection.recovery = undefined;
            }, failure => this.reconnect(connection, failure));
        }, Math.min(1000 * 2 ** connection.attempts++, 30000));
    }

    stop(): void {
        const connection = this.current;
        this.current = undefined;
        if (connection) connection.epoch++;
        if (connection?.timer) clearInterval(connection.timer);
        if (connection?.retry) clearTimeout(connection.retry);
        connection?.recovery?.reject(new Error('ROOM_CONNECTION_CANCELLED'));
        if (connection) connection.recovery = undefined;
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
