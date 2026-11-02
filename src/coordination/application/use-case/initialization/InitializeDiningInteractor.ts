import {InitializeDiningUseCase} from '../../port/in/initialization/InitializeDiningUseCase';
import {InitializeIdentityUseCase} from '../../port/in/device/InitializeIdentityUseCase';
import {GetPersonalDiningUseCase} from '../../port/in/device/GetPersonalDiningUseCase';
import {PublishRestaurantOriginalUseCase} from '../../port/in/catalog/PublishRestaurantOriginalUseCase';
import {ListRestaurantsUseCase} from '../../../../contexts/catalog/application/port/in/ListRestaurantsUseCase';

export class InitializeDiningInteractor implements InitializeDiningUseCase {
    constructor(private readonly initialize: InitializeIdentityUseCase, private readonly personal: GetPersonalDiningUseCase,
                private readonly restaurants: ListRestaurantsUseCase, private readonly publish: PublishRestaurantOriginalUseCase,
                private readonly id: () => string) {}
    async execute(request: InitializeDiningUseCase.Request): Promise<InitializeDiningUseCase.Response> {
        await this.initialize.execute(new InitializeIdentityUseCase.Request(this.id()));
        // Add new bundled restaurants to existing devices without overwriting edits or deletions.
        const knownIds = new Set(this.restaurants.execute(new ListRestaurantsUseCase.Request('local', true)).value.map(r => r.id));
        const actor = this.personal.execute().identity!;
        for (const restaurant of request.referenceCatalog) {
            if (!knownIds.has(restaurant.id)) {
                await this.publish.execute(new PublishRestaurantOriginalUseCase.Request(restaurant, actor.id));
                knownIds.add(restaurant.id);
            }
        }
        return new InitializeDiningUseCase.Response();
    }
}
