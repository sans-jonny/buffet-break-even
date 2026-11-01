import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface GetConsumptionUseCase extends UseCase<GetConsumptionUseCase.Request, GetConsumptionUseCase.Response> {
    execute(request: GetConsumptionUseCase.Request): GetConsumptionUseCase.Response;
}

export namespace GetConsumptionUseCase {
    export const token = Symbol('GetConsumptionUseCase') as UseCase.Token<GetConsumptionUseCase>;

    export class Request extends UseCase.Request {
        constructor(readonly activityId: string, readonly restaurantId: string) {
            super();
            UseCase.id(activityId);
            UseCase.id(restaurantId);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Accounting.Consumption | undefined;

        constructor(value: Accounting.Consumption | undefined) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
