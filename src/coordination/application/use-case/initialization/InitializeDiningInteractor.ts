import {InitializeDiningUseCase} from '../../port/in/initialization/InitializeDiningUseCase';
import {InitializeIdentityUseCase} from '../../port/in/device/InitializeIdentityUseCase';
import {PublishLocalRestaurantUseCase} from '../../port/in/catalog/PublishLocalRestaurantUseCase';
import {ListRestaurantsUseCase} from '../../../../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import type {Dining} from '../../dto/Dining';

export class InitializeDiningInteractor implements InitializeDiningUseCase {
    constructor(private readonly initialize: InitializeIdentityUseCase,
                private readonly restaurants: ListRestaurantsUseCase, private readonly publish: PublishLocalRestaurantUseCase,
                private readonly id: () => string) {}
    async execute(request: InitializeDiningUseCase.Request): Promise<InitializeDiningUseCase.Response> {
        await this.initialize.execute(new InitializeIdentityUseCase.Request(this.id()));
        const known = new Map(this.restaurants.execute(new ListRestaurantsUseCase.Request('local', true)).value.map(r => [r.id, r]));
        for (const restaurant of request.referenceCatalog) {
            const existing = known.get(restaurant.id);
            // Public menus are bundled application data. Refresh their local content on startup;
            // private originals and explicit deletions belong to the device user.
            if (existing && (existing.type !== 'PUBLIC' || restaurant.type !== 'PUBLIC' || existing.deleted ||
                this.content(existing) === this.content(restaurant))) continue;
            const updated = {...restaurant, version: existing ? existing.version + 1 : restaurant.version};
            await this.publish.execute(new PublishLocalRestaurantUseCase.Request(updated));
            known.set(restaurant.id, updated);
        }
        return new InitializeDiningUseCase.Response();
    }

    private content(restaurant: Dining.Restaurant): string {
        return JSON.stringify({name: restaurant.name, type: restaurant.type, deleted: restaurant.deleted,
            restaurantCategory: {id: restaurant.restaurantCategory.id, name: restaurant.restaurantCategory.name},
            categories: restaurant.categories.map(({id, name}) => ({id, name})),
            products: restaurant.products.map(({id, categoryId, name, priceMinor}) => ({id, categoryId, name, priceMinor}))});
    }
}
