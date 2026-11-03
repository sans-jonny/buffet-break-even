import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Collaboration} from './Collaboration';

export interface ChangeMemberNicknameUseCase extends UseCase<ChangeMemberNicknameUseCase.Request, ChangeMemberNicknameUseCase.Response> {
    execute(request: ChangeMemberNicknameUseCase.Request): Promise<ChangeMemberNicknameUseCase.Response>;
}

export namespace ChangeMemberNicknameUseCase {
    export const token = Symbol('ChangeMemberNicknameUseCase') as InjectionToken<ChangeMemberNicknameUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope,
                    readonly roomId: string,
                    readonly memberId: string,
                    readonly nickname: string) {
            super(scope);
            UseCase.id(roomId);
            UseCase.id(memberId);
            UseCase.nickname(nickname);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Collaboration.Room;

        constructor(value: Collaboration.Room) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
