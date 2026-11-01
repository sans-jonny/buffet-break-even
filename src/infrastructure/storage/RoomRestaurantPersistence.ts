import type {RoomRestaurantPublisher} from '../../coordination/application/port/out/RoomRestaurantPublisher';
import type {Transaction} from '../../kernel/application/Transaction';
import {RestaurantRecord} from '../../../protocol/RestaurantRecord';

/** Copies raw records across the persistence boundary; never constructs a Domain object. */
export class RoomRestaurantPersistence implements RoomRestaurantPublisher {
    constructor(private readonly storage: Transaction.View, private readonly remote?: RoomRestaurantPersistence.Remote) {}

    async publish(roomId: string, restaurantIds: readonly string[]): Promise<void> {
        if (!restaurantIds.length) return;
        if (!this.remote) throw new Error('ROOM_CATALOG_REMOTE_REQUIRED');
        const records = restaurantIds.map(id => {
            const record = this.storage.get<RestaurantRecord.Document>(`catalog/local/restaurant/${id}`);
            if (!record) throw new Error('RESTAURANT_NOT_FOUND');
            // Legacy private records predate the restaurantCategory persistence field.
            return {...record, restaurantCategory: record.restaurantCategory || {id: 'My', name: '我的餐厅'}};
        });
        RestaurantRecord.validate(records);
        await this.remote.uploadRestaurants(roomId, records);
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
                products: record.products.map(product => ({...product, id: prefix + product.id, categoryId: prefix + product.categoryId}))
            };
        }
    }
}

export namespace RoomRestaurantPersistence {
    export interface Remote {
        uploadRestaurants(roomId: string, restaurants: readonly RestaurantRecord.Document[]): Promise<void>;
        readRestaurants(roomId: string): Promise<readonly RestaurantRecord.Document[]>;
    }
}
