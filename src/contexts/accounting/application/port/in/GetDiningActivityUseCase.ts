import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface GetDiningActivityUseCase extends UseCase<GetDiningActivityUseCase.Request, GetDiningActivityUseCase.Response> {
    execute(request: GetDiningActivityUseCase.Request): GetDiningActivityUseCase.Response;
}

export namespace GetDiningActivityUseCase {
    export const token = Symbol('GetDiningActivityUseCase') as InjectionToken<GetDiningActivityUseCase>;

    export type Context = Readonly<{singleScopeId?: string}>;

    export class Request extends UseCase.Request {
        constructor(readonly activityId: string, readonly context?: GetDiningActivityUseCase.Context) {
            super();
            if (context?.singleScopeId !== undefined) UseCase.id(context.singleScopeId);
            this.context = UseCase.dto(context);
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
