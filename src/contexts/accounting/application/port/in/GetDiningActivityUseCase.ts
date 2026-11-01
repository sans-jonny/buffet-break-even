import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface GetDiningActivityUseCase extends UseCase<GetDiningActivityUseCase.Request, GetDiningActivityUseCase.Response> {
    execute(request: GetDiningActivityUseCase.Request): GetDiningActivityUseCase.Response;
}

export namespace GetDiningActivityUseCase {
    export const token = Symbol('GetDiningActivityUseCase') as UseCase.Token<GetDiningActivityUseCase>;

    export class Request extends UseCase.Request {
        constructor(readonly activityId: string) {
            super();
            UseCase.id(activityId);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Accounting.Activity | undefined;

        constructor(value: Accounting.Activity | undefined) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
