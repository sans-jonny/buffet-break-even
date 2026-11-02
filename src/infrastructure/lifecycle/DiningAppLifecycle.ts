import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {RefreshDiningSessionUseCase} from '../../coordination/application/port/in/session/RefreshDiningSessionUseCase';
import type {RoomConnection} from '../../coordination/application/port/out/session/RoomConnection';

/** Owns foreground connection activation, independent of page and Store lifetimes. */
export class DiningAppLifecycle {
    static readonly token = Symbol('DiningAppLifecycle') as InjectionToken<DiningAppLifecycle>;
    private current?: {ready: Promise<void>};
    private disposed = false;

    constructor(private readonly refresh: RefreshDiningSessionUseCase,
                private readonly connection: RoomConnection & {suspend(): void; resume(): void},
                private readonly report: (error: unknown) => void) {}

    resume(): Promise<void> {
        if (this.disposed) return Promise.resolve();
        if (this.current) return this.current.ready;
        const activation = {ready: Promise.resolve()};
        this.current = activation;
        this.connection.resume();
        activation.ready = Promise.resolve().then(async () => {
            if (this.current !== activation) return;
            await this.refresh.execute(new RefreshDiningSessionUseCase.Request());
        }).catch(error => {
            // Hiding the app cancels an in-flight connection. Its late result
            // must not report an error or clear a newer foreground activation.
            if (this.current !== activation) return;
            this.current = undefined;
            this.report(error);
        });
        return activation.ready;
    }

    suspend(): void {
        this.current = undefined;
        this.connection.suspend();
    }

    dispose(): void {
        this.disposed = true;
        this.suspend();
    }
}
