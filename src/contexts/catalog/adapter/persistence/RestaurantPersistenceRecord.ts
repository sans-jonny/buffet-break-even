import type {Restaurant} from '../../domain/aggregate/Restaurant';

export namespace RestaurantPersistenceRecord {
    /** Read legacy records without changing their stored events or assigning a guessed cuisine. */
    export function normalize(record: Restaurant.State): Restaurant.State {
        return {...record, restaurantCategory: record.restaurantCategory || (record.type === 'PUBLIC'
            ? {id: 'Other', name: '其他餐厅'} : {id: 'My', name: '我的餐厅'})};
    }
}
