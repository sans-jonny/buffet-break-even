import {DefaultNickname} from '../../../service/DefaultNickname';
import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';

export interface InitializeIdentityUseCase extends UseCase<InitializeIdentityUseCase.Request, InitializeIdentityUseCase.Response> {
    execute(request: InitializeIdentityUseCase.Request): Promise<InitializeIdentityUseCase.Response>;
}

export namespace InitializeIdentityUseCase {
    export const token = Symbol('InitializeIdentityUseCase') as InjectionToken<InitializeIdentityUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly identityId: string, readonly nickname = DefaultNickname.generate()) {
            super({scopeId: 'local-personal', roomId: null});
            UseCase.id(identityId);
            UseCase.nickname(nickname);
        }
    }

    export class Response extends UseCase.Response {
    }
}
