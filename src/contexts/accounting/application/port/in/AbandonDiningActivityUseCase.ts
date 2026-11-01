import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface AbandonDiningActivityUseCase extends UseCase<AbandonDiningActivityUseCase.Request, AbandonDiningActivityUseCase.Response> {
    execute(request: AbandonDiningActivityUseCase.Request): Promise<AbandonDiningActivityUseCase.Response>;
}

export namespace AbandonDiningActivityUseCase {
    export const token = Symbol('AbandonDiningActivityUseCase') as UseCase.Token<AbandonDiningActivityUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope, readonly activityId: string) {
            super(scope);
            UseCase.id(activityId);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Accounting.Activity;

        constructor(value: Accounting.Activity) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
