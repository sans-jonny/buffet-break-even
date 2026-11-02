import {InvalidRequestError} from '../../../../../kernel/application/InvalidRequestError';
import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Collaboration} from './Collaboration';

export interface JoinRoomUseCase extends UseCase<JoinRoomUseCase.Request, JoinRoomUseCase.Response> {
    execute(request: JoinRoomUseCase.Request): Promise<JoinRoomUseCase.Response>;
}

export namespace JoinRoomUseCase {
    export const token = Symbol('JoinRoomUseCase') as InjectionToken<JoinRoomUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope,
                    readonly roomId: string,
                    readonly memberId: string,
                    readonly nickname: string,
                    readonly joinedAt: string) {
            super(scope);
            UseCase.id(roomId);
            UseCase.id(memberId);
            UseCase.nickname(nickname);
            if (Number.isNaN(Date.parse(joinedAt))) throw new InvalidRequestError('INVALID_MEMBER');
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
