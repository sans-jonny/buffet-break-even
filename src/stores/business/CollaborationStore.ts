import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {computed} from 'vue';
import {defineStore, type Pinia} from 'pinia';
import {QueryClientProvider} from '../../infrastructure/query/QueryClientProvider';
import type {Dining} from '../../coordination/application/dto/Dining';

export namespace CollaborationStore {
    export const token = Symbol('CollaborationStore') as InjectionToken<ReturnType<typeof create>>;
    export function create(queries: QueryClientProvider, pinia: Pinia) {
        return defineStore('collaboration', () => ({
            rooms: computed(() => queries.read<readonly Dining.Room[]>(['collaboration', 'rooms']))
        }))(pinia);
    }
}
