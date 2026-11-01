/** Upload the selected private persistence records without invoking Domain. */
export interface RoomRestaurantPublisher {
    publish(roomId: string, restaurantIds: readonly string[]): Promise<void>;
}

export namespace RoomRestaurantPublisher {
    export const token = Symbol('RoomRestaurantPublisher');
}
