import {AccountingStore} from './AccountingStore';
import {BusinessStoreScope} from '../BusinessStoreScope';

export function useAccountingStore() {
    return BusinessStoreScope.use(AccountingStore.token);
}
