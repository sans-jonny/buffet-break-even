/** Transport/persistence document only. No aggregate construction or business commands. */
export namespace RestaurantRecord {
    /** Presentation metadata belongs to the transport envelope, never individual records. */
    export type Image = {restaurantId: string; productId: string; url: string};
    export type Catalog = {restaurants: readonly Document[]; images: readonly Image[]};
    export type Document = Readonly<{
        id: string;
        name: string;
        restaurantCategory: Readonly<{id: string; name: string}>;
        type: 'PUBLIC' | 'PRIVATE' | 'ROOM_COPY';
        version: number;
        deleted: boolean;
        categories: readonly Readonly<{id: string; name: string}>[];
        products: readonly Readonly<{id: string; name: string; categoryId: string; priceMinor: number}>[];
        sourceId?: string;
        sourceVersion?: number;
    }>;

    export function validate(records: unknown): asserts records is readonly Document[] {
        const text = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
        if (!Array.isArray(records) || records.length > 200) throw new Error('INVALID_RESTAURANT_RECORDS');
        const ids = new Set<string>();
        for (const record of records) {
            if (!record || !text(record.id) || !text(record.name) || ids.has(record.id)
                || record.type !== 'PRIVATE' || record.deleted !== false || !Number.isSafeInteger(record.version) || record.version < 1
                || record.restaurantCategory?.id !== 'My' || !text(record.restaurantCategory?.name)
                || !Array.isArray(record.categories) || !Array.isArray(record.products))
                throw new Error('INVALID_RESTAURANT_RECORD');
            ids.add(record.id);
            const categoryIds = new Set<string>(), productIds = new Set<string>();
            for (const category of record.categories) {
                if (!category || !text(category.id) || !text(category.name) || categoryIds.has(category.id)) throw new Error('INVALID_RESTAURANT_RECORD');
                categoryIds.add(category.id);
            }
            for (const product of record.products) {
                if (!product || !text(product.id) || !text(product.name) || productIds.has(product.id)
                    || !categoryIds.has(product.categoryId) || !Number.isSafeInteger(product.priceMinor) || product.priceMinor < 0)
                    throw new Error('INVALID_RESTAURANT_RECORD');
                productIds.add(product.id);
            }
        }
    }
}
