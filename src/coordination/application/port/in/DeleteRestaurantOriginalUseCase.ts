import {UseCase} from '../../../../kernel/application/UseCase';

export interface DeleteRestaurantOriginalUseCase extends UseCase<DeleteRestaurantOriginalUseCase.Request, DeleteRestaurantOriginalUseCase.Response> {
    execute(request: DeleteRestaurantOriginalUseCase.Request): Promise<DeleteRestaurantOriginalUseCase.Response>;
}

export namespace DeleteRestaurantOriginalUseCase {
    export const token = Symbol('DeleteRestaurantOriginalUseCase') as UseCase.Token<DeleteRestaurantOriginalUseCase>;

    export class Request extends UseCase.Request {
        constructor(readonly restaurantId: string, readonly actorId: string) {
            super();
            UseCase.id(actorId);
        }
    }

    export class Response extends UseCase.Response {
    }
}
