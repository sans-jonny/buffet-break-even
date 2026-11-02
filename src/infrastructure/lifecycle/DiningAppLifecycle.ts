import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {RefreshDiningSessionUseCase} from '../../coordination/application/port/in/session/RefreshDiningSessionUseCase';
import type {RoomConnection} from '../../coordination/application/port/out/session/RoomConnection';

/** Owns foreground connection activation, independent of page and Store lifetimes. */
export class DiningAppLifecycle {
    static readonly token = Symbol('DiningAppLifecycle') as InjectionToken<DiningAppLifecycle>;
    private current?: {ready: Promise<void>};
    private disposed = false;
    private foreground = false;
    private connected = true;
    private exiting?: Promise<void>;

    constructor(private readonly refresh: RefreshDiningSessionUseCase,
                private readonly connection: RoomConnection & {suspend(): void; resume(): void},
                private readonly report: (error: unknown) => void, private readonly onRecovered?: () => Promise<void>,
                private readonly onExit?: () => Promise<unknown>) {}

    resume(): Promise<void> {
        if (this.disposed) return Promise.resolve();
        this.foreground = true;
        if (this.current) return this.current.ready;
        const activation = {ready: Promise.resolve()};
        this.current = activation;
        this.connection.resume();
        activation.ready = Promise.resolve().then(async () => {
            if (this.current !== activation) return;
            await this.refresh.execute(new RefreshDiningSessionUseCase.Request());
            if (this.current === activation) await this.onRecovered?.();
        }).catch(error => {
            // Hiding the app cancels an in-flight connection. Its late result
            // must not report an error or clear a newer foreground activation.
            if (this.current !== activation) return;
            this.current = undefined;
            this.report(error);
        });
        return activation.ready;
    }

    networkChanged(connected: boolean): void {
        const recovered = connected && !this.connected;
        this.connected = connected;
        if (recovered && this.foreground && !this.disposed) { this.current = undefined; void this.resume(); }
    }

    suspend(): void {
        this.foreground = false;
        this.current = undefined;
        this.connection.suspend();
    }

    exit(): Promise<void> {
        if (this.exiting) return this.exiting;
        this.foreground = false;
        this.current = undefined;
        this.exiting = Promise.resolve().then(() => this.onExit?.()).then(() => {}).catch(this.report)
            .finally(() => { this.suspend(); this.exiting = undefined; });
        return this.exiting;
    }

    dispose(): void {
        this.disposed = true;
        this.suspend();
    }
}
