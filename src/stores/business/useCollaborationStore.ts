import {CollaborationStore} from './CollaborationStore';
import {BusinessStoreScope} from '../BusinessStoreScope';

export function useCollaborationStore() {
    return BusinessStoreScope.use(CollaborationStore.token);
}
