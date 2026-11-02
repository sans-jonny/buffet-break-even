import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface SubmitDiningRoundUseCase extends UseCase<SubmitDiningRoundUseCase.Request, SubmitDiningRoundUseCase.Response> {
    execute(request: SubmitDiningRoundUseCase.Request): Promise<SubmitDiningRoundUseCase.Response>;
}

export namespace SubmitDiningRoundUseCase {
    export const token = Symbol('SubmitDiningRoundUseCase') as UseCase.Token<SubmitDiningRoundUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly session: Dining.Session, readonly actorId: string, readonly restaurantId: string) {
            super(session);
            UseCase.id(actorId);
            UseCase.id(restaurantId);
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
