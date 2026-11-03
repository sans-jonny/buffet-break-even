import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import type {Dining} from '../../../dto/Dining';

export interface JoinDiningRoomUseCase extends UseCase<JoinDiningRoomUseCase.Request, JoinDiningRoomUseCase.Response> {
    execute(request: JoinDiningRoomUseCase.Request): Promise<JoinDiningRoomUseCase.Response>;
}

export namespace JoinDiningRoomUseCase {
    export const token = Symbol('JoinDiningRoomUseCase') as InjectionToken<JoinDiningRoomUseCase>;
    export class Request extends UseCase.Request {
        constructor(readonly code?: string) { super(); if (code) UseCase.id(code); }
    }
    export class Response extends UseCase.Response {
        readonly value: Dining.Session;
        constructor(value: Dining.Session) { super(); this.value = UseCase.dto(value); }
    }
}
