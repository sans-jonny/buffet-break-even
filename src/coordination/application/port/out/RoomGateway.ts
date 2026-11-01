export interface RoomGateway {
    create(): Promise<{roomId: string; code: string}>;
    locate(code: string): Promise<{roomId: string}>;
}
