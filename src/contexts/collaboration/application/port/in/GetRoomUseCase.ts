import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Collaboration} from './Collaboration';

export interface GetRoomUseCase extends UseCase<GetRoomUseCase.Request, GetRoomUseCase.Response> {
    execute(request: GetRoomUseCase.Request): GetRoomUseCase.Response;
}

export namespace GetRoomUseCase {
    export const token = Symbol('GetRoomUseCase') as InjectionToken<GetRoomUseCase>;

    export type Context = Readonly<{activityId?: string; scopeId?: string; memberId?: string; access?: 'EDIT' | 'RECOVER' | 'RESULT' | 'HISTORY'}>;

    export class Request extends UseCase.Request {
        constructor(readonly roomId: string, readonly context?: GetRoomUseCase.Context) {
            super();
            if (context?.activityId !== undefined) UseCase.id(context.activityId);
            if (context?.scopeId !== undefined) UseCase.id(context.scopeId);
            if (context?.memberId !== undefined) UseCase.id(context.memberId);
            this.context = UseCase.dto(context);
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
