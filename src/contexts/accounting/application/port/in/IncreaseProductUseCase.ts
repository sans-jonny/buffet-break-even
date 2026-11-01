import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface IncreaseProductUseCase extends UseCase<IncreaseProductUseCase.Request, IncreaseProductUseCase.Response> {
    execute(request: IncreaseProductUseCase.Request): Promise<IncreaseProductUseCase.Response>;
}

export namespace IncreaseProductUseCase {
    export const token = Symbol('IncreaseProductUseCase') as UseCase.Token<IncreaseProductUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope,
                    readonly activityId: string,
                    readonly restaurantId: string,
                    readonly roundId: string,
                    readonly productId: string,
                    readonly quantity: number) {
            super(scope);
            UseCase.id(activityId);
            UseCase.id(restaurantId);
            UseCase.id(roundId);
            UseCase.id(productId);
            UseCase.quantity(quantity);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Accounting.Consumption;

        constructor(value: Accounting.Consumption) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
