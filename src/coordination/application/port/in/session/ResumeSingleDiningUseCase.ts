import {UseCase} from '../../../../../kernel/application/UseCase';
import type {Dining} from '../../../dto/Dining';

export interface ResumeSingleDiningUseCase extends UseCase<ResumeSingleDiningUseCase.Request, ResumeSingleDiningUseCase.Response> {
    execute(request: ResumeSingleDiningUseCase.Request): Promise<ResumeSingleDiningUseCase.Response>;
}

export namespace ResumeSingleDiningUseCase {
    export const token = Symbol('ResumeSingleDiningUseCase') as UseCase.Token<ResumeSingleDiningUseCase>;
    export class Request extends UseCase.Request {
        constructor(readonly session: Dining.Session) { super(); UseCase.id(session.activityId); this.session = UseCase.dto(session); }
    }
    export class Response extends UseCase.Response {
        readonly value: Dining.Session;
        constructor(value: Dining.Session) { super(); this.value = UseCase.dto(value); }
    }
}
