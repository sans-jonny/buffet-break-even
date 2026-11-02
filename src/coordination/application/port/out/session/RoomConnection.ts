import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';

export interface RoomConnection {
    watch(roomId: string): Promise<void>;
    stop(): void;
    acknowledge(roomId: string): Promise<void>;
    hasUnconfirmed?(roomId: string): boolean;
}

export namespace RoomConnection {
    export const token = Symbol('RoomConnection') as InjectionToken<RoomConnection>;
}
