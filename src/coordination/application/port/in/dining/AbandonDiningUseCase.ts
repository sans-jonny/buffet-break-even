import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface AbandonDiningUseCase extends UseCase<AbandonDiningUseCase.Request, AbandonDiningUseCase.Response> {
    execute(request: AbandonDiningUseCase.Request): Promise<AbandonDiningUseCase.Response>;
}

export namespace AbandonDiningUseCase {
    export const token = Symbol('AbandonDiningUseCase') as UseCase.Token<AbandonDiningUseCase>;

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
