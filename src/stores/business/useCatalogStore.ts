import {CatalogStore} from './CatalogStore';
import {BusinessStoreScope} from '../BusinessStoreScope';

export function useCatalogStore() {
    return BusinessStoreScope.use(CatalogStore.token);
}
