import {UseCase} from '../../../../../kernel/application/UseCase';
import {Collaboration} from './Collaboration';

export interface AbandonRoomUseCase extends UseCase<AbandonRoomUseCase.Request, AbandonRoomUseCase.Response> {
    execute(request: AbandonRoomUseCase.Request): Promise<AbandonRoomUseCase.Response>;
}

export namespace AbandonRoomUseCase {
    export const token = Symbol('AbandonRoomUseCase') as UseCase.Token<AbandonRoomUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope, readonly roomId: string, readonly actorId: string) {
            super(scope);
            UseCase.id(roomId);
            UseCase.id(actorId);
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
