import {CommandState} from '../CommandState';
import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {computed, readonly} from 'vue';
import {defineStore, type Pinia} from 'pinia';
import {QueryClientProvider} from '../../infrastructure/query/QueryClientProvider';
import {PublishLocalRestaurantUseCase} from '../../coordination/application/port/in/catalog/PublishLocalRestaurantUseCase';
import {DeleteLocalRestaurantUseCase} from '../../coordination/application/port/in/catalog/DeleteLocalRestaurantUseCase';
import type {Dining} from '../../coordination/application/dto/Dining';
import {Domain} from '../../kernel/domain/Domain';

export namespace CatalogStore {
    export const token = Symbol('CatalogStore') as InjectionToken<ReturnType<typeof create>>;
    export function create(queries: QueryClientProvider, publish: PublishLocalRestaurantUseCase,
                           remove: DeleteLocalRestaurantUseCase, pinia: Pinia) {
        return defineStore('catalog', () => {
            const commands = CommandState.create(queries);
            const command = commands.run;
            const restaurants = computed(() => readonly(queries.restaurants('local').filter(r => !r.deleted)));
            const categories = computed(() => readonly([...new Map(restaurants.value.map(r => [r.restaurantCategory.id, r.restaurantCategory])).values()]));
            return {restaurants, categories, loading: commands.loading, error: commands.error,
                restaurant: (id: string, includeDeleted = false) => {
                    const restaurant = queries.restaurants('local').find(r => r.id === id && (includeDeleted || !r.deleted));
                    Domain.require(restaurant, 'RESTAURANT_NOT_FOUND');
                    return restaurant;
                },
                publish: (restaurant: Dining.Restaurant) => command(async () => {
                    return publish.execute(new PublishLocalRestaurantUseCase.Request(restaurant));
                }),
                remove: (id: string) => command(() => remove.execute(new DeleteLocalRestaurantUseCase.Request(id)))
            };
        })(pinia);
    }
}
