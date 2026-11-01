export interface RoomConnection {
    watch(roomId: string): Promise<void>;
    stop(): void;
    acknowledge(roomId: string): Promise<void>;
}
