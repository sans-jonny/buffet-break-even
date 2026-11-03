import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Collaboration} from './Collaboration';

export interface LeaveRoomUseCase extends UseCase<LeaveRoomUseCase.Request, LeaveRoomUseCase.Response> {
    execute(request: LeaveRoomUseCase.Request): Promise<LeaveRoomUseCase.Response>;
}

export namespace LeaveRoomUseCase {
    export const token = Symbol('LeaveRoomUseCase') as InjectionToken<LeaveRoomUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope, readonly roomId: string, readonly memberId: string, readonly date: string) {
            super(scope);
            UseCase.id(roomId);
            UseCase.id(memberId);
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
