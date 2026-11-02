import {UseCase} from '../../../../../kernel/application/UseCase';

export interface LeaveDiningSessionUseCase extends UseCase<LeaveDiningSessionUseCase.Request, LeaveDiningSessionUseCase.Response> {
    execute(request: LeaveDiningSessionUseCase.Request): Promise<LeaveDiningSessionUseCase.Response>;
}

export namespace LeaveDiningSessionUseCase {
    export const token = Symbol('LeaveDiningSessionUseCase') as UseCase.Token<LeaveDiningSessionUseCase>;
    export class Request extends UseCase.Request {

    }
    export class Response extends UseCase.Response {
    }
}
