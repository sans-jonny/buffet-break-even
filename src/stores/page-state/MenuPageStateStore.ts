import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {reactive} from 'vue';
import {defineStore, type Pinia} from 'pinia';

/** Only interaction state lives here; route identities select independent slots. */
export namespace MenuPageStateStore {
    export const token = Symbol('MenuPageStateStore') as InjectionToken<ReturnType<typeof create>>;
    export type State = {
        activeCategory: string;
        editingPrice: boolean;
        priceInput: string;
        showCart: boolean;
    };
    export function create(pinia: Pinia) {
        return defineStore('menu-page-state', () => {
            const slots = reactive<Record<string, State>>({});
            const selectedRestaurants = reactive<Record<string, string>>({});
            function state(key: string): State {
                return slots[key] ||= {activeCategory: '', editingPrice: false, priceInput: '200', showCart: false};
            }
            return {slots, state, selectedRestaurants};
        })(pinia);
    }
}
