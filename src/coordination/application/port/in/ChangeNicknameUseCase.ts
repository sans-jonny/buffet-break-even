import {UseCase} from '../../../../kernel/application/UseCase';
import {Domain} from '../../../../kernel/domain/Domain';

export interface ChangeNicknameUseCase extends UseCase<ChangeNicknameUseCase.Request, ChangeNicknameUseCase.Response> {
    execute(request: ChangeNicknameUseCase.Request): Promise<ChangeNicknameUseCase.Response>;
}

export namespace ChangeNicknameUseCase {
    export const token = Symbol('ChangeNicknameUseCase') as UseCase.Token<ChangeNicknameUseCase>;

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
