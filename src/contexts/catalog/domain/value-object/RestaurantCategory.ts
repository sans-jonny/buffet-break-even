import {Domain} from '../../../../kernel/domain/Domain';

/** Restaurant cuisine/category, distinct from the categories of dishes within a menu. */
export class RestaurantCategory {
    constructor(readonly id: string, readonly name: string) {
        Domain.require(!!id?.trim() && !!name?.trim(), 'INVALID_RESTAURANT_CATEGORY');
    }
}
