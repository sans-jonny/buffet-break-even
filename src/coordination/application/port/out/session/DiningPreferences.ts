import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';

export interface DiningPreferences {
    lastRoom(): string | undefined;
    rememberRoom(roomId: string): Promise<void>;
}

export namespace DiningPreferences {
    export const token = Symbol('DiningPreferences') as InjectionToken<DiningPreferences>;
}
