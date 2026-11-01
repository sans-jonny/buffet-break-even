import {UseCase} from '../../../../kernel/application/UseCase';
import {Dining} from './Dining';

export interface PublishLocalRestaurantUseCase extends UseCase<PublishLocalRestaurantUseCase.Request, PublishLocalRestaurantUseCase.Response> {
    execute(request: PublishLocalRestaurantUseCase.Request): Promise<PublishLocalRestaurantUseCase.Response>;
}

export namespace PublishLocalRestaurantUseCase {
    export const token = Symbol('PublishLocalRestaurantUseCase') as UseCase.Token<PublishLocalRestaurantUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly restaurant: Dining.Restaurant) {
            super({scopeId: 'local-catalog', roomId: null});
            UseCase.id(restaurant.id);
            this.restaurant = UseCase.dto(restaurant);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Dining.Restaurant;

        constructor(value: Dining.Restaurant) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
