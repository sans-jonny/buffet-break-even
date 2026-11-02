import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Domain} from '../../../../../kernel/domain/Domain';

export interface ChangeNicknameUseCase extends UseCase<ChangeNicknameUseCase.Request, ChangeNicknameUseCase.Response> {
    execute(request: ChangeNicknameUseCase.Request): Promise<ChangeNicknameUseCase.Response>;
}

export namespace ChangeNicknameUseCase {
    export const token = Symbol('ChangeNicknameUseCase') as InjectionToken<ChangeNicknameUseCase>;

    export class Request extends UseCase.Request {
        constructor(readonly nickname: string) {
            super();
            UseCase.nickname(nickname);
        }
    }

    export class Response extends UseCase.Response {
    }
}
