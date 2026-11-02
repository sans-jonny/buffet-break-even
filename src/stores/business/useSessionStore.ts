import {SessionStore} from './SessionStore';
import {BusinessStoreScope} from '../BusinessStoreScope';

export function useSessionStore() {
    return BusinessStoreScope.use(SessionStore.token);
}
