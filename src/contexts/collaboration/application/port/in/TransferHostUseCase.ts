import {UseCase} from '../../../../../kernel/application/UseCase';
import {Collaboration} from './Collaboration';

export interface TransferHostUseCase extends UseCase<TransferHostUseCase.Request, TransferHostUseCase.Response> {
    execute(request: TransferHostUseCase.Request): Promise<TransferHostUseCase.Response>;
}

export namespace TransferHostUseCase {
    export const token = Symbol('TransferHostUseCase') as UseCase.Token<TransferHostUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope,
                    readonly roomId: string,
                    readonly actorId: string,
                    readonly targetId: string) {
            super(scope);
            UseCase.id(roomId);
            UseCase.id(actorId);
            UseCase.id(targetId);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Collaboration.Room;

        constructor(value: Collaboration.Room) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
