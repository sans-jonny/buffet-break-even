import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface DecreaseDiningProductUseCase extends UseCase<DecreaseDiningProductUseCase.Request, DecreaseDiningProductUseCase.Response> {
    execute(request: DecreaseDiningProductUseCase.Request): Promise<DecreaseDiningProductUseCase.Response>;
}

export namespace DecreaseDiningProductUseCase {
    export const token = Symbol('DecreaseDiningProductUseCase') as UseCase.Token<DecreaseDiningProductUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly session: Dining.Session,
                    readonly actorId: string,
                    readonly restaurantId: string,
                    readonly productId: string,
                    readonly quantity: number) {
            super(session);
            UseCase.id(actorId);
            UseCase.id(restaurantId);
            UseCase.id(productId);
            UseCase.quantity(quantity);
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
