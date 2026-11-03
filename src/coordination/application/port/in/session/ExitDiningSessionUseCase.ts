import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';

export interface ExitDiningSessionUseCase extends UseCase<ExitDiningSessionUseCase.Request, ExitDiningSessionUseCase.Response> {
    execute(request: ExitDiningSessionUseCase.Request): Promise<ExitDiningSessionUseCase.Response>;
}

export namespace ExitDiningSessionUseCase {
    export const token = Symbol('ExitDiningSessionUseCase') as InjectionToken<ExitDiningSessionUseCase>;
    export class Request extends UseCase.Request {}
    export class Response extends UseCase.Response {}
}
