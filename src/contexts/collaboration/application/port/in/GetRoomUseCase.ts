import {UseCase} from '../../../../../kernel/application/UseCase';
import {Collaboration} from './Collaboration';

export interface GetRoomUseCase extends UseCase<GetRoomUseCase.Request, GetRoomUseCase.Response> {
    execute(request: GetRoomUseCase.Request): GetRoomUseCase.Response;
}

export namespace GetRoomUseCase {
    export const token = Symbol('GetRoomUseCase') as UseCase.Token<GetRoomUseCase>;

    export class Request extends UseCase.Request {
        constructor(readonly roomId: string) {
            super();
            UseCase.id(roomId);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Collaboration.Room | undefined;

        constructor(value: Collaboration.Room | undefined) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
