import type {InjectionToken} from '../../../src/kernel/application/InjectionToken';
import {computed} from 'vue';
import {defineStore, type Pinia} from 'pinia';
import {QueryClientProvider} from './QueryClientProvider';

export namespace AccountingStore {
    export const token = Symbol('AccountingStore') as InjectionToken<ReturnType<typeof create>>;
    export function create(queries: QueryClientProvider, pinia: Pinia) {
        return defineStore('accounting', () => ({
            activities: computed(() => queries.activities()),
            consumption: (activityId: string, restaurantId: string) => queries.consumption(activityId, restaurantId)
        }))(pinia);
    }
}
