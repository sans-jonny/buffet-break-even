export namespace PageSelection {
    export function restaurant(restaurants: readonly {id: string}[], selected?: string): string {
        return restaurants.some(restaurant => restaurant.id === selected) ? selected! : restaurants[0]?.id || '';
    }
}
