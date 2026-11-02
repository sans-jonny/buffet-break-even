import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {computed} from 'vue';
import {defineStore, type Pinia} from 'pinia';
import {QueryClientProvider} from '../../infrastructure/query/QueryClientProvider';
import type {Accounting} from '../../contexts/accounting/application/port/in/Accounting';

export namespace AccountingStore {
    export const token = Symbol('AccountingStore') as InjectionToken<ReturnType<typeof create>>;
    export function create(queries: QueryClientProvider, pinia: Pinia) {
        return defineStore('accounting', () => ({
            activities: computed(() => queries.read<readonly Accounting.Activity[]>(['accounting', 'activities'])),
            consumption: (activityId: string, restaurantId: string) => queries.read<{value: Accounting.Consumption | undefined}>(
                ['accounting', 'consumption', activityId, restaurantId]).value
        }))(pinia);
    }
}
