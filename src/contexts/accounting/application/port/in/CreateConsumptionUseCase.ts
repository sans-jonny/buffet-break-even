import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface CreateConsumptionUseCase extends UseCase<CreateConsumptionUseCase.Request, CreateConsumptionUseCase.Response> {
    execute(request: CreateConsumptionUseCase.Request): Promise<CreateConsumptionUseCase.Response>;
}

export namespace CreateConsumptionUseCase {
    export const token = Symbol('CreateConsumptionUseCase') as UseCase.Token<CreateConsumptionUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope,
                    readonly activityId: string,
                    readonly restaurantId: string,
                    readonly roundId: string) {
            super(scope);
            UseCase.id(activityId);
            UseCase.id(restaurantId);
            UseCase.id(roundId);
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
