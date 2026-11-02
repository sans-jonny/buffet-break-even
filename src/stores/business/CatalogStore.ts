import {CommandState} from '../CommandState';
import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {computed, readonly} from 'vue';
import {defineStore, type Pinia} from 'pinia';
import {QueryClientProvider} from '../../infrastructure/query/QueryClientProvider';
import {PublishRestaurantOriginalUseCase} from '../../coordination/application/port/in/catalog/PublishRestaurantOriginalUseCase';
import {DeleteRestaurantOriginalUseCase} from '../../coordination/application/port/in/catalog/DeleteRestaurantOriginalUseCase';
import type {Dining} from '../../coordination/application/dto/Dining';
import {Domain} from '../../kernel/domain/Domain';
import {RetryCatalogSyncUseCase} from '../../coordination/application/port/in/catalog/RetryCatalogSyncUseCase';

export namespace CatalogStore {
    export const token = Symbol('CatalogStore') as InjectionToken<ReturnType<typeof create>>;
    export function create(queries: QueryClientProvider, publish: PublishRestaurantOriginalUseCase,
                           remove: DeleteRestaurantOriginalUseCase, retry: RetryCatalogSyncUseCase, pinia: Pinia) {
        return defineStore('catalog', () => {
            const commands = CommandState.create(queries);
            const command = commands.run;
            const restaurants = computed(() => readonly(queries.restaurants('local').filter(r => !r.deleted)));
            const categories = computed(() => readonly([...new Map(restaurants.value.map(r => [r.restaurantCategory.id, r.restaurantCategory])).values()]));
            const identity = () => {
                const actor = queries.personal().identity;
                Domain.require(actor, 'IDENTITY_REQUIRED');
                return actor;
            };
            return {restaurants, categories, loading: commands.loading, error: commands.error,
                pendingSyncData: computed(() => {
                    const actor = queries.personal().identity;
                    return actor ? queries.pendingCatalogSync(actor.id) : [];
                }),
                restaurant: (id: string, includeDeleted = false) => {
                    const restaurant = queries.restaurants('local').find(r => r.id === id && (includeDeleted || !r.deleted));
                    Domain.require(restaurant, 'RESTAURANT_NOT_FOUND');
                    return restaurant;
                },
                publish: (restaurant: Dining.Restaurant) => command(async () => {
                    return publish.execute(new PublishRestaurantOriginalUseCase.Request(restaurant, identity().id));
                }),
                remove: (id: string) => command(() => remove.execute(new DeleteRestaurantOriginalUseCase.Request(id, identity().id))),
                retrySync: (id: string) => command(() => retry.execute(new RetryCatalogSyncUseCase.Request(id, identity().id)))
            };
        })(pinia);
    }
}
