import {DiningStore} from './DiningStore';
import {BusinessStoreScope} from '../BusinessStoreScope';

export function useDiningStore() {
    return BusinessStoreScope.use(DiningStore.token);
}
