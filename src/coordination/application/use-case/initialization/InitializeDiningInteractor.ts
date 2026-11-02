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
        // Deleted originals still count: an intentionally emptied catalog must not be reseeded.
        if (!this.restaurants.execute(new ListRestaurantsUseCase.Request('local', true)).value.length) {
            const actor = this.personal.execute().identity!;
            for (const restaurant of request.referenceCatalog)
                await this.publish.execute(new PublishRestaurantOriginalUseCase.Request(restaurant, actor.id));
        }
        return new InitializeDiningUseCase.Response();
    }
}
