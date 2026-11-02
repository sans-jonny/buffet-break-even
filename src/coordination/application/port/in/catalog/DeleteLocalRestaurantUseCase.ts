import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface DeleteLocalRestaurantUseCase extends UseCase<DeleteLocalRestaurantUseCase.Request, DeleteLocalRestaurantUseCase.Response> {
    execute(request: DeleteLocalRestaurantUseCase.Request): Promise<DeleteLocalRestaurantUseCase.Response>;
}

export namespace DeleteLocalRestaurantUseCase {
    export const token = Symbol('DeleteLocalRestaurantUseCase') as UseCase.Token<DeleteLocalRestaurantUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly restaurantId: string) {
            super({scopeId: 'local-catalog', roomId: null});
            UseCase.id(restaurantId);
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
