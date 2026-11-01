import {UseCase} from '../../../../kernel/application/UseCase';

export interface ClearDiningSessionUseCase extends UseCase<ClearDiningSessionUseCase.Request, ClearDiningSessionUseCase.Response> {
    execute(request: ClearDiningSessionUseCase.Request): Promise<ClearDiningSessionUseCase.Response>;
}

export namespace ClearDiningSessionUseCase {
    export const token = Symbol('ClearDiningSessionUseCase') as UseCase.Token<ClearDiningSessionUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor() {
            super({scopeId: 'local-personal', roomId: null});
        }
    }

    export class Response extends UseCase.Response {
    }
}
