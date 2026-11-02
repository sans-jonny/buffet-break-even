import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';

export interface RefreshDiningSessionUseCase extends UseCase<RefreshDiningSessionUseCase.Request, RefreshDiningSessionUseCase.Response> {
    execute(request: RefreshDiningSessionUseCase.Request): Promise<RefreshDiningSessionUseCase.Response>;
}

export namespace RefreshDiningSessionUseCase {
    export const token = Symbol('RefreshDiningSessionUseCase') as InjectionToken<RefreshDiningSessionUseCase>;
    export class Request extends UseCase.Request {

    }
    export class Response extends UseCase.Response {
    }
}
