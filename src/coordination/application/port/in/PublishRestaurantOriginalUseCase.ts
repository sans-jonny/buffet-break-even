import {UseCase} from '../../../../kernel/application/UseCase';
import {Dining} from './Dining';

export interface PublishRestaurantOriginalUseCase extends UseCase<PublishRestaurantOriginalUseCase.Request, PublishRestaurantOriginalUseCase.Response> {
    execute(request: PublishRestaurantOriginalUseCase.Request): Promise<PublishRestaurantOriginalUseCase.Response>;
}

export namespace PublishRestaurantOriginalUseCase {
    export const token = Symbol('PublishRestaurantOriginalUseCase') as UseCase.Token<PublishRestaurantOriginalUseCase>;

    export class Request extends UseCase.Request {
        constructor(readonly restaurant: Dining.Restaurant, readonly actorId: string) {
            super();
            UseCase.id(actorId);
            this.restaurant = UseCase.dto(restaurant);
        }
    }

    export class Response extends UseCase.Response {
    }
}
