import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface ClearRoundUseCase extends UseCase<ClearRoundUseCase.Request, ClearRoundUseCase.Response> {
    execute(request: ClearRoundUseCase.Request): Promise<ClearRoundUseCase.Response>;
}

export namespace ClearRoundUseCase {
    export const token = Symbol('ClearRoundUseCase') as InjectionToken<ClearRoundUseCase>;

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
