import type {Dining} from '../in/Dining';

/** Committed dining operations used by the device session workflow. */
export interface DiningSessionActions {
    initialize(): Promise<void>;
    identity(): Dining.Identity;
    session(): Dining.Session | undefined;
    localRestaurants(includeDeleted?: boolean): Dining.Restaurant[];
    publishLocal(restaurant: Dining.Restaurant): Promise<void>;
    findRoom(roomId: string): Dining.Room | undefined;
    selectSession(session: Dining.Session): Promise<void>;
    createRoom(roomId: string, code: string, total: number, categoryId?: string): Promise<void>;
    joinRoom(roomId: string): Promise<void>;
    leave(): Promise<void>;
}
