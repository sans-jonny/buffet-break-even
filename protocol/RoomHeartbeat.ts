/** Connection liveness only; heartbeat messages never enter the domain event stream. */
export namespace RoomHeartbeat {
    export type Settings = Readonly<{intervalMs: number; timeoutMs: number}>;
    export const defaults: Settings = {intervalMs: 10000, timeoutMs: 30000};
}
