import {UseCase} from '../../../../../kernel/application/UseCase';
import {InvalidRequestError} from '../../../../../kernel/application/InvalidRequestError';
import type {Catalog} from './Catalog';

/** Shared request validation; only Request constructors call these rules. */
export namespace RestaurantInput {
    export function category(value: {id: string; name: string}): void {
        UseCase.required(value, 'INVALID_CATEGORY');
        UseCase.id(value.id); UseCase.id(value.name);
    }
    export function product(value: {id: string; name: string; categoryId: string; priceMinor: number}): void {
        UseCase.required(value, 'INVALID_PRODUCT');
        UseCase.id(value.id); UseCase.id(value.name); UseCase.id(value.categoryId); UseCase.amount(value.priceMinor);
    }
    export function validate(value: Catalog.RestaurantView): void {
        UseCase.required(value, 'INVALID_RESTAURANT');
        UseCase.id(value.id); UseCase.id(value.name); category(value.restaurantCategory);
        if (!Number.isSafeInteger(value.version) || value.version <= 0 || !['PRIVATE', 'PUBLIC', 'ROOM_COPY'].includes(value.type)
            || typeof value.deleted !== 'boolean' || !Array.isArray(value.categories) || !Array.isArray(value.products))
            throw new InvalidRequestError('INVALID_RESTAURANT');
        value.categories.forEach(category); value.products.forEach(product);
        if (new Set(value.products.map(p => p.id)).size !== value.products.length || new Set(value.categories.map(c => c.id)).size !== value.categories.length)
            throw new InvalidRequestError('DUPLICATE_CATALOG_ID');
        if (value.products.some(p => !value.categories.some(c => c.id === p.categoryId))) throw new InvalidRequestError('INVALID_PRODUCT');
        if (value.type === 'PRIVATE' && value.restaurantCategory.id !== 'My') throw new InvalidRequestError('PRIVATE_RESTAURANT_CATEGORY_REQUIRED');
    }
    export class CategoryRequest extends UseCase.Request {
        constructor(readonly value: {id: string; name: string}) { super(); category(value); this.value = UseCase.dto(value); }
    }
    export class ProductRequest extends UseCase.Request {
        constructor(readonly value: {id: string; name: string; categoryId: string; priceMinor: number}) { super(); product(value); this.value = UseCase.dto(value); }
    }
}
