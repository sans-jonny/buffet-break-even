import {defineStore, type Pinia} from 'pinia';
import {shallowRef} from 'vue';
import type {Dining} from '../../coordination/application/dto/Dining';
import type {InjectionToken} from '../../kernel/application/InjectionToken';

export namespace SessionPageStateStore {
    export const token = Symbol('SessionPageStateStore') as InjectionToken<ReturnType<typeof create>>;
    export function create(pinia: Pinia) {
        return defineStore('session-page-state', () => {
            const pendingSelection = shallowRef<Dining.Session>();
            return {pendingSelection};
        })(pinia);
    }
}
