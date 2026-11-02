import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {computed, readonly, ref} from 'vue';
import {defineStore, type Pinia} from 'pinia';
import {QueryClientProvider} from '../../infrastructure/query/QueryClientProvider';
import {PublishRestaurantOriginalUseCase} from '../../coordination/application/port/in/catalog/PublishRestaurantOriginalUseCase';
import {DeleteRestaurantOriginalUseCase} from '../../coordination/application/port/in/catalog/DeleteRestaurantOriginalUseCase';
import {GetPersonalDiningUseCase} from '../../coordination/application/port/in/device/GetPersonalDiningUseCase';
import type {Dining} from '../../coordination/application/dto/Dining';

export namespace CatalogStore {
    export const token = Symbol('CatalogStore') as InjectionToken<ReturnType<typeof create>>;
    export function create(queries: QueryClientProvider, publish: PublishRestaurantOriginalUseCase,
                           remove: DeleteRestaurantOriginalUseCase, pinia: Pinia) {
        return defineStore('catalog', () => {
            const pending = ref(0), error = ref<unknown>(null);
            const restaurants = computed(() => readonly(queries.read<readonly Dining.Restaurant[]>(['catalog', 'local']).filter(r => !r.deleted)));
            const categories = computed(() => readonly([...new Map(restaurants.value.map(r => [r.restaurantCategory.id, r.restaurantCategory])).values()]));
            async function command<T>(work: () => Promise<T>) {
                pending.value++; error.value = null;
                const release = queries.acquire();
                try { const response = await work(); await queries.settled(); return response; }
                catch (failure) { error.value = failure; throw failure; }
                finally { pending.value--; release(); }
            }
            const identity = () => queries.read<GetPersonalDiningUseCase.Response>(['coordination', 'personal']).identity;
            return {restaurants, categories, loading: computed(() => pending.value > 0), error: computed(() => error.value),
                restaurant: (id: string) => {
                    const restaurant = restaurants.value.find(r => r.id === id);
                    if (!restaurant) throw new Error('RESTAURANT_NOT_FOUND');
                    return restaurant;
                },
                publish: (restaurant: Dining.Restaurant) => command(async () => {
                    if (!identity()) throw new Error('IDENTITY_REQUIRED');
                    return publish.execute(new PublishRestaurantOriginalUseCase.Request(restaurant, identity()!.id));
                }),
                remove: (id: string) => command(() => remove.execute(new DeleteRestaurantOriginalUseCase.Request(id, identity()!.id)))
            };
        })(pinia);
    }
}
