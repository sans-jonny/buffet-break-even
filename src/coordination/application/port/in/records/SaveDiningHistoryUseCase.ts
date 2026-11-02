import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface SaveDiningHistoryUseCase extends UseCase<SaveDiningHistoryUseCase.Request, SaveDiningHistoryUseCase.Response> {
    execute(request: SaveDiningHistoryUseCase.Request): Promise<SaveDiningHistoryUseCase.Response>;
}

export namespace SaveDiningHistoryUseCase {
    export const token = Symbol('SaveDiningHistoryUseCase') as InjectionToken<SaveDiningHistoryUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly session: Dining.Session, readonly result: Dining.Result) {
            super({scopeId: 'local-personal', roomId: null});
            UseCase.id(session.activityId);
            this.session = UseCase.dto(session);
            this.result = UseCase.dto(result);
        }
    }

    export class Response extends UseCase.Response {
    }
}
