import {AggregateRoot} from '../../../../kernel/domain/AggregateRoot';
import {Domain} from '../../../../kernel/domain/Domain';
import {Money} from '../value-object/Money';
import {Category} from '../entity/Category';
import {Product} from '../entity/Product';
import {RestaurantPublished} from '../event/RestaurantPublished';
import {RestaurantDeleted} from '../event/RestaurantDeleted';
import {RestaurantRejected} from '../rejection/RestaurantRejected';
import {RestaurantCategory} from '../value-object/RestaurantCategory';

export class Restaurant extends AggregateRoot<Restaurant.State> {
    readonly name: string;
    readonly restaurantCategory: Restaurant.State['restaurantCategory'];
    readonly type: 'PUBLIC' | 'PRIVATE' | 'ROOM_COPY';
    readonly deleted: boolean;
    readonly categories: Restaurant.State['categories'];
    readonly products: readonly Restaurant.Product[];
    readonly sourceId?: string;
    readonly sourceVersion?: number;

    private constructor(state: Restaurant.State) {
        super(state.id, state.version);
        this.name = Domain.copy(state.name);
        this.restaurantCategory = Domain.copy(state.restaurantCategory);
        this.type = Domain.copy(state.type);
        this.deleted = Domain.copy(state.deleted);
        this.categories = Domain.copy(state.categories);
        this.products = state.products.map(product => new Product(product).snapshot);
        this.sourceId = Domain.copy(state.sourceId);
        this.sourceVersion = Domain.copy(state.sourceVersion);
    }

    static publish(state: Restaurant.State): RestaurantPublished | RestaurantRejected {
        return new RestaurantPublished(state.id, state.version - 1, {
            name: state.name,
            restaurantCategory: state.restaurantCategory,
            type: state.type,
            deleted: state.deleted,
            categories: state.categories,
            products: state.products.map(({id, categoryId, name, priceMinor}) => ({id, categoryId, name, priceMinor})),
            sourceId: state.sourceId,
            sourceVersion: state.sourceVersion
        });
    }

    static reconstitute(state: Restaurant.State): Restaurant {
        Domain.require(!!state.name.trim() && Domain.positive(state.version), 'INVALID_RESTAURANT');
        new RestaurantCategory(state.restaurantCategory?.id, state.restaurantCategory?.name);
        Domain.require(state.type !== 'PRIVATE' || state.restaurantCategory.id === 'My', 'PRIVATE_RESTAURANT_CATEGORY_REQUIRED');
        state.categories.forEach(c => new Category(c));
        state.products.forEach(p => new Product(p));
        Domain.require(new Set(state.products.map(p => p.id)).size === state.products.length && new Set(state.categories.map(c => c.id)).size === state.categories.length && state.products.every(p => state.categories.some(c => c.id === p.categoryId)), 'INVALID_PRODUCT');
        return new Restaurant(state);
    }

    snapshot(): Restaurant.State {
        return Domain.copy({
            id: this.id,
            version: this.version,
            name: this.name,
            restaurantCategory: this.restaurantCategory,
            type: this.type,
            deleted: this.deleted,
            categories: this.categories,
            products: this.products,
            sourceId: this.sourceId,
            sourceVersion: this.sourceVersion
        });
    }

    authorizeAvailable(productId?: string): void {
        Domain.require(!this.deleted, 'RESTAURANT_UNAVAILABLE');
        if (productId !== undefined) Domain.require(this.products.some(p => p.id === productId), 'PRODUCT_NOT_FOUND');
    }

    authorizePrivate(): void { Domain.require(this.type === 'PRIVATE', 'PRIVATE_ORIGINAL_REQUIRED'); }

    static authorizeVersion(version: number, previous?: Restaurant): void {
        Domain.require(!previous || version === previous.version + 1, 'STALE_CATALOG_VERSION');
    }

    static selectCategory<T extends {restaurantCategory: {id: string}}>(restaurants: readonly T[], categoryId: string): readonly T[] {
        const selected = restaurants.filter(r => r.restaurantCategory.id === categoryId);
        Domain.require(selected.length, 'RESTAURANT_CATEGORY_EMPTY');
        return selected;
    }

    replaceProducts(products: readonly Restaurant.Product[],
                    categories?: Restaurant.State['categories']): RestaurantPublished | RestaurantRejected {
        if (this.deleted)
            return new RestaurantRejected('RESTAURANT_UNAVAILABLE');
        return Restaurant.publish({
            ...this.snapshot(),
            products,
            categories: categories || this.categories,
            version: this.version + 1
        });
    }

    deleteCategory(categoryId: string): RestaurantPublished | RestaurantRejected {
        return this.replaceProducts(this.products.filter(p => p.categoryId !== categoryId), this.categories.filter(c => c.id !== categoryId));
    }

    delete(): RestaurantDeleted {
        return new RestaurantDeleted(this.id, this.version, {});
    }

    copyIntoRoom(roomId: string): RestaurantPublished | RestaurantRejected {
        if (this.type !== 'PRIVATE' || this.deleted)
            return new RestaurantRejected('PRIVATE_ORIGINAL_REQUIRED');
        const prefix = `${roomId}:${this.id}:`;
        return Restaurant.publish({
            ...this.snapshot(),
            id: `${roomId}:${this.id}`,
            type: 'ROOM_COPY',
            version: 1,
            sourceId: this.id,
            sourceVersion: this.version,
            categories: this.categories.map(c => ({...c, id: prefix + c.id})),
            products: this.products.map(p => ({...p, id: prefix + p.id, categoryId: prefix + p.categoryId}))
        });
    }

    synchronizeFrom(original: Restaurant.State,
                    roomId: string): RestaurantPublished | RestaurantDeleted | RestaurantRejected {
        if (this.sourceId !== original.id || original.version <= (this.sourceVersion || 0))
            return new RestaurantRejected('STALE_CATALOG_VERSION');
        if (original.deleted)
            return new RestaurantDeleted(this.id, this.version, {sourceVersion: original.version});
        const copied = Restaurant.reconstitute(original).copyIntoRoom(roomId);
        if ('rejected' in copied)
            return copied;
        return Restaurant.publish({...copied.facts, id: copied.aggregateId, deleted: false, version: this.version + 1});
    }

    addProduct(categoryId: string,
               productId: string,
               name: string,
               price: Money.Price): RestaurantPublished | RestaurantDeleted | RestaurantRejected {
        if (!this.categories.some(category => category.id === categoryId)) return new RestaurantRejected('INVALID_PRODUCT');
        if (this.products.some(p => p.id === productId))
            return new RestaurantRejected('DUPLICATE_CATALOG_ID');
        return this.replaceProducts([...this.snapshot().products, {
            id: productId,
            categoryId,
            name,
            priceMinor: price.minor
        }]);
    }

    deleteProduct(productId: string) {
        return this.replaceProducts(this.products.filter(p => p.id !== productId));
    }

    changeProductPrice(productId: string, price: Money.Price) {
        if (!this.products.some(p => p.id === productId))
            return new RestaurantRejected('PRODUCT_NOT_FOUND');
        return this.replaceProducts(this.products.map(p => p.id === productId ? {
            ...p,
            priceMinor: price.minor
        } : p));
    }
}

export namespace Restaurant {
    export type Event = RestaurantPublished | RestaurantDeleted;
    export type Product = Readonly<{
        id: string;
        categoryId: string;
        name: string;
        priceMinor: number;
    }>;
    export type State = Readonly<{
        id: string;
        name: string;
        restaurantCategory: Readonly<{id: string; name: string}>;
        type: 'PUBLIC' | 'PRIVATE' | 'ROOM_COPY';
        version: number;
        deleted: boolean;
        categories: readonly {
            id: string;
            name: string;
        }[];
        products: readonly Product[];
        sourceId?: string;
        sourceVersion?: number;
    }>;
}
