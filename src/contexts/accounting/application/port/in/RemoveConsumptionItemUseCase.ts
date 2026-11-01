import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface RemoveConsumptionItemUseCase extends UseCase<RemoveConsumptionItemUseCase.Request, RemoveConsumptionItemUseCase.Response> {
    execute(request: RemoveConsumptionItemUseCase.Request): Promise<RemoveConsumptionItemUseCase.Response>;
}

export namespace RemoveConsumptionItemUseCase {
    export const token = Symbol('RemoveConsumptionItemUseCase') as UseCase.Token<RemoveConsumptionItemUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope,
                    readonly activityId: string,
                    readonly restaurantId: string,
                    readonly roundId: string,
                    readonly productId: string) {
            super(scope);
            UseCase.id(activityId);
            UseCase.id(restaurantId);
            UseCase.id(roundId);
            UseCase.id(productId);
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
