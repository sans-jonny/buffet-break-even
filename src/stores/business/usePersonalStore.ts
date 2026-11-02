import {PersonalStore} from './PersonalStore';
import {BusinessStoreScope} from '../BusinessStoreScope';

export function usePersonalStore() {
    return BusinessStoreScope.use(PersonalStore.token);
}
