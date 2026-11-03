import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface TransferDiningHostUseCase extends UseCase<TransferDiningHostUseCase.Request, TransferDiningHostUseCase.Response> {
    execute(request: TransferDiningHostUseCase.Request): Promise<TransferDiningHostUseCase.Response>;
}

export namespace TransferDiningHostUseCase {
    export const token = Symbol('TransferDiningHostUseCase') as InjectionToken<TransferDiningHostUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly session: Dining.Session, readonly actorId: string, readonly targetId: string) {
            super(session);
            UseCase.id(session.roomId!);
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
