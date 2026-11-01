import {UseCase} from '../../../../kernel/application/UseCase';
import {Dining} from './Dining';

export interface RemoveDiningProductUseCase extends UseCase<RemoveDiningProductUseCase.Request, RemoveDiningProductUseCase.Response> {
    execute(request: RemoveDiningProductUseCase.Request): Promise<RemoveDiningProductUseCase.Response>;
}

export namespace RemoveDiningProductUseCase {
    export const token = Symbol('RemoveDiningProductUseCase') as UseCase.Token<RemoveDiningProductUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly session: Dining.Session,
                    readonly actorId: string,
                    readonly restaurantId: string,
                    readonly productId: string) {
            super(session);
            UseCase.id(actorId);
            UseCase.id(restaurantId);
            UseCase.id(productId);
            this.session = UseCase.dto(session);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: undefined;

        constructor(value: undefined) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
