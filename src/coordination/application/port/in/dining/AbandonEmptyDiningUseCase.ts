import {UseCase} from '../../../../../kernel/application/UseCase';
import type {Dining} from '../../../dto/Dining';

export interface AbandonEmptyDiningUseCase extends UseCase<AbandonEmptyDiningUseCase.Request, AbandonEmptyDiningUseCase.Response> {
    execute(request: AbandonEmptyDiningUseCase.Request): Promise<AbandonEmptyDiningUseCase.Response>;
}

export namespace AbandonEmptyDiningUseCase {
    export const token = Symbol('AbandonEmptyDiningUseCase') as UseCase.Token<AbandonEmptyDiningUseCase>;
    export class Request extends UseCase.TransactionRequest {
        constructor(readonly session: Dining.Session, readonly actorId: string) {
            super(session);
            UseCase.id(actorId);
            this.session = UseCase.dto(session);
        }
    }
    export class Response extends UseCase.Response {
        constructor(readonly empty: boolean) { super(); }
    }
}
