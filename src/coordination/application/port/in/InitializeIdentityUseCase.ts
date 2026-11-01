import {UseCase} from '../../../../kernel/application/UseCase';

export interface InitializeIdentityUseCase extends UseCase<InitializeIdentityUseCase.Request, InitializeIdentityUseCase.Response> {
    execute(request: InitializeIdentityUseCase.Request): Promise<InitializeIdentityUseCase.Response>;
}

export namespace InitializeIdentityUseCase {
    export const token = Symbol('InitializeIdentityUseCase') as UseCase.Token<InitializeIdentityUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly identityId: string) {
            super({scopeId: 'local-personal', roomId: null});
            UseCase.id(identityId);
        }
    }

    export class Response extends UseCase.Response {
    }
}
