import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';

export interface AuthorizeRoomUseCase extends UseCase<AuthorizeRoomUseCase.Request, AuthorizeRoomUseCase.Response> {
    execute(request: AuthorizeRoomUseCase.Request): AuthorizeRoomUseCase.Response;
}

export namespace AuthorizeRoomUseCase {
    export const token = Symbol('AuthorizeRoomUseCase') as InjectionToken<AuthorizeRoomUseCase>;

    export class Request extends UseCase.Request {
        constructor(readonly roomId: string, readonly memberId: string, readonly hostOnly = false) {
            super();
            UseCase.id(roomId);
            UseCase.id(memberId);
            this.hostOnly = UseCase.dto(hostOnly);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: undefined;

        constructor(value: undefined) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
