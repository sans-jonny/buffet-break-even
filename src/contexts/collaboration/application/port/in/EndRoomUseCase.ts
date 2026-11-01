import {UseCase} from '../../../../../kernel/application/UseCase';
import {Collaboration} from './Collaboration';

export interface EndRoomUseCase extends UseCase<EndRoomUseCase.Request, EndRoomUseCase.Response> {
    execute(request: EndRoomUseCase.Request): Promise<EndRoomUseCase.Response>;
}

export namespace EndRoomUseCase {
    export const token = Symbol('EndRoomUseCase') as UseCase.Token<EndRoomUseCase>;

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
