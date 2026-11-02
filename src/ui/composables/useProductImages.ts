import {ProductImageClient} from '../../infrastructure/media/ProductImageClient';
import {useRequired} from '../useRequired';

/** Image display and platform upload are presentation IO, separate from catalog commands. */
export function useProductImages() {
    return useRequired<ProductImageClient>(ProductImageClient.token);
}
