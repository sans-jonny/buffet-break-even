export interface DiningPreferences {
    lastRoom(): string | undefined;
    rememberRoom(roomId: string): Promise<void>;
    selectedRestaurant(): string | undefined;
    selectRestaurant(restaurantId: string): Promise<void>;
}
