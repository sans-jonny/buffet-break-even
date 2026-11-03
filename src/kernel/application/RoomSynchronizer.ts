export interface RoomSynchronizer {
    synchronize(roomId: string): Promise<void>;

    rebuild(roomId: string): Promise<void>;

    acknowledgeUnknown(roomId: string): Promise<void>;
}
