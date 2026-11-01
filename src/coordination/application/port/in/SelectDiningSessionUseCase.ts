import {UseCase} from '../../../../kernel/application/UseCase';
import {Dining} from './Dining';

export interface SelectDiningSessionUseCase extends UseCase<SelectDiningSessionUseCase.Request, SelectDiningSessionUseCase.Response> {
    execute(request: SelectDiningSessionUseCase.Request): Promise<SelectDiningSessionUseCase.Response>;
}

export namespace SelectDiningSessionUseCase {
    export const token = Symbol('SelectDiningSessionUseCase') as UseCase.Token<SelectDiningSessionUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly session: Dining.Session) {
            super({scopeId: 'local-personal', roomId: null});
            UseCase.id(session.activityId);
            this.session = UseCase.dto(session);
        }
    }

    export class Response extends UseCase.Response {
    }
}
