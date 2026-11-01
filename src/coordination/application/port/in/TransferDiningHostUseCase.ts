import {UseCase} from '../../../../kernel/application/UseCase';
import {Dining} from './Dining';

export interface TransferDiningHostUseCase extends UseCase<TransferDiningHostUseCase.Request, TransferDiningHostUseCase.Response> {
    execute(request: TransferDiningHostUseCase.Request): Promise<TransferDiningHostUseCase.Response>;
}

export namespace TransferDiningHostUseCase {
    export const token = Symbol('TransferDiningHostUseCase') as UseCase.Token<TransferDiningHostUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly session: Dining.Session, readonly actorId: string, readonly targetId: string) {
            super(session);
            UseCase.id(actorId);
            UseCase.id(targetId);
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
