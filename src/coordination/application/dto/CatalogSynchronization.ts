export namespace CatalogSynchronization {
    export type Failure = Readonly<{roomId: string; code: string}>;
    export type Result = Readonly<{localCommitted: true; pendingRooms: readonly Failure[]}>;
    export type Pending = Readonly<{restaurantId: string; name: string; roomIds: readonly string[]}>;
}
