import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';

export interface RoomGateway {
    create(): Promise<{roomId: string; code: string}>;
    locate(code: string): Promise<{roomId: string}>;
}

export namespace RoomGateway {
    export const token = Symbol('RoomGateway') as InjectionToken<RoomGateway>;
}
