import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface JoinMultiplayerDiningUseCase extends UseCase<JoinMultiplayerDiningUseCase.Request, JoinMultiplayerDiningUseCase.Response> {
    execute(request: JoinMultiplayerDiningUseCase.Request): Promise<JoinMultiplayerDiningUseCase.Response>;
}

export namespace JoinMultiplayerDiningUseCase {
    export const token = Symbol('JoinMultiplayerDiningUseCase') as UseCase.Token<JoinMultiplayerDiningUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly roomId: string, readonly member: Dining.Identity) {
            super({scopeId: roomId, roomId});
            UseCase.id(roomId);
            UseCase.id(member.id);
            this.member = UseCase.dto(member);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Dining.Session;

        constructor(value: Dining.Session) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
