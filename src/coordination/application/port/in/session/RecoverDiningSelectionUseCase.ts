import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import type {Dining} from '../../../dto/Dining';

export interface RecoverDiningSelectionUseCase extends UseCase<RecoverDiningSelectionUseCase.Request, RecoverDiningSelectionUseCase.Response> {
    execute(request: RecoverDiningSelectionUseCase.Request): Promise<RecoverDiningSelectionUseCase.Response>;
}

export namespace RecoverDiningSelectionUseCase {
    export const token = Symbol('RecoverDiningSelectionUseCase') as InjectionToken<RecoverDiningSelectionUseCase>;
    export class Request extends UseCase.Request {
        readonly session: Dining.Session;
        constructor(session: Dining.Session) { super(); UseCase.id(session.activityId); this.session = UseCase.dto(session); }
    }
    export class Response extends UseCase.Response {
        readonly value: Dining.Session;
        constructor(value: Dining.Session) { super(); this.value = UseCase.dto(value); }
    }
}
