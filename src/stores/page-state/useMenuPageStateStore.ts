import {MenuPageStateStore} from './MenuPageStateStore';
import {BusinessStoreScope} from '../BusinessStoreScope';

export function useMenuPageStateStore() {
    return BusinessStoreScope.use(MenuPageStateStore.token);
}
