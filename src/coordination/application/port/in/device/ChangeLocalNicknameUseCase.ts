import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Domain} from '../../../../../kernel/domain/Domain';

export interface ChangeLocalNicknameUseCase extends UseCase<ChangeLocalNicknameUseCase.Request, ChangeLocalNicknameUseCase.Response> {
    execute(request: ChangeLocalNicknameUseCase.Request): Promise<ChangeLocalNicknameUseCase.Response>;
}

export namespace ChangeLocalNicknameUseCase {
    export const token = Symbol('ChangeLocalNicknameUseCase') as InjectionToken<ChangeLocalNicknameUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly nickname: string) {
            super({scopeId: 'local-personal', roomId: null});
            UseCase.id(nickname);
            Domain.require(nickname.trim().length <= 24, 'INVALID_NICKNAME');
        }
    }

    export class Response extends UseCase.Response {
    }
}
