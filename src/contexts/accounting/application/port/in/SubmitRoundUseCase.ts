import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface SubmitRoundUseCase extends UseCase<SubmitRoundUseCase.Request, SubmitRoundUseCase.Response> {
    execute(request: SubmitRoundUseCase.Request): Promise<SubmitRoundUseCase.Response>;
}

export namespace SubmitRoundUseCase {
    export const token = Symbol('SubmitRoundUseCase') as UseCase.Token<SubmitRoundUseCase>;

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
