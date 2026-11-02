import type {RoomRestaurantPublisher} from '../../coordination/application/port/out/catalog/RoomRestaurantPublisher';
import type {Transaction} from '../../kernel/application/Transaction';
import {RestaurantRecord} from '../../../protocol/RestaurantRecord';

/** Copies raw records across the persistence boundary; never constructs a Domain object. */
export class RoomRestaurantPersistence implements RoomRestaurantPublisher {
    constructor(private readonly storage: Transaction.View, private readonly remote?: RoomRestaurantPersistence.Remote,
                private readonly media?: RoomRestaurantPersistence.Media) {}

    async publish(roomId: string, restaurantIds: readonly string[]): Promise<void> {
        if (!restaurantIds.length) return;
        if (!this.remote) throw new Error('ROOM_CATALOG_REMOTE_REQUIRED');
        const records = restaurantIds.map(id => {
            const record = this.storage.get<RestaurantRecord.Document>(`catalog/local/restaurant/${id}`);
            if (!record) throw new Error('RESTAURANT_NOT_FOUND');
            return {...record,
                products: record.products.map(({id, name, categoryId, priceMinor}) => ({id, name, categoryId, priceMinor}))};
        });
        RestaurantRecord.validate(records);
        await this.remote.uploadRestaurants(roomId, records);
        await this.publishMedia(roomId, restaurantIds);
    }

    async publishMedia(roomId: string, restaurantIds: readonly string[]): Promise<void> {
        if (!this.media) return;
        for (const id of restaurantIds) {
            const restaurant = this.storage.get<RestaurantRecord.Document>(`catalog/local/restaurant/${id}`);
            if (restaurant?.type === 'PRIVATE') await this.media.share(roomId, id, restaurant.deleted ? [] : restaurant.products.map(product => product.id));
        }
    }

    async restore(roomId: string, state: Transaction.State): Promise<void> {
        if (!this.remote) return;
        const records = await this.remote.readRestaurants(roomId);
        RestaurantRecord.validate(records);
        for (const record of records) {
            const id = `${roomId}:${record.id}`, key = `catalog/${roomId}/restaurant/${id}`, prefix = `${id}:`;
            // Immutable baseline: subsequent catalog events must never be overwritten.
            if (state[key]) continue;
            state[key] = {
                ...record, id, type: 'ROOM_COPY', version: 1, sourceId: record.id, sourceVersion: record.version,
                categories: record.categories.map(category => ({...category, id: prefix + category.id})),
                products: record.products.map(product => ({id: prefix + product.id, name: product.name,
                    categoryId: prefix + product.categoryId, priceMinor: product.priceMinor}))
            };
        }
    }
}

export namespace RoomRestaurantPersistence {
    export interface Media {
        share(roomId: string, restaurantId: string, productIds: readonly string[]): Promise<void>;
    }
    export interface Remote {
        uploadRestaurants(roomId: string, restaurants: readonly RestaurantRecord.Document[]): Promise<void>;
        readRestaurants(roomId: string): Promise<readonly RestaurantRecord.Document[]>;
    }
}
