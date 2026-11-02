import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface LeaveDiningRoomUseCase extends UseCase<LeaveDiningRoomUseCase.Request, LeaveDiningRoomUseCase.Response> {
    execute(request: LeaveDiningRoomUseCase.Request): Promise<LeaveDiningRoomUseCase.Response>;
}

export namespace LeaveDiningRoomUseCase {
    export const token = Symbol('LeaveDiningRoomUseCase') as InjectionToken<LeaveDiningRoomUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly session: Dining.Session, readonly actorId: string) {
            super(session);
            UseCase.id(actorId);
            this.session = UseCase.dto(session);
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
