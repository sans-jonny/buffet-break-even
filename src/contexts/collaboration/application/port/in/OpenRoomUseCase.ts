import {UseCase} from '../../../../../kernel/application/UseCase';
import {Collaboration} from './Collaboration';

export interface OpenRoomUseCase extends UseCase<OpenRoomUseCase.Request, OpenRoomUseCase.Response> {
    execute(request: OpenRoomUseCase.Request): Promise<OpenRoomUseCase.Response>;
}

export namespace OpenRoomUseCase {
    export const token = Symbol('OpenRoomUseCase') as UseCase.Token<OpenRoomUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope,
                    readonly roomId: string,
                    readonly code: string,
                    readonly activityId: string,
                    readonly memberId: string,
                    readonly nickname: string,
                    readonly sourceIds: readonly string[]) {
            super(scope);
            UseCase.id(roomId);
            UseCase.id(activityId);
            UseCase.id(memberId);
            UseCase.id(nickname);
            this.sourceIds = UseCase.dto(sourceIds);
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
