import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface IncreaseDiningProductUseCase extends UseCase<IncreaseDiningProductUseCase.Request, IncreaseDiningProductUseCase.Response> {
    execute(request: IncreaseDiningProductUseCase.Request): Promise<IncreaseDiningProductUseCase.Response>;
}

export namespace IncreaseDiningProductUseCase {
    export const token = Symbol('IncreaseDiningProductUseCase') as InjectionToken<IncreaseDiningProductUseCase>;

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
