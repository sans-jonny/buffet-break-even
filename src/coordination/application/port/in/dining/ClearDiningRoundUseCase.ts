import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface ClearDiningRoundUseCase extends UseCase<ClearDiningRoundUseCase.Request, ClearDiningRoundUseCase.Response> {
    execute(request: ClearDiningRoundUseCase.Request): Promise<ClearDiningRoundUseCase.Response>;
}

export namespace ClearDiningRoundUseCase {
    export const token = Symbol('ClearDiningRoundUseCase') as InjectionToken<ClearDiningRoundUseCase>;

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
