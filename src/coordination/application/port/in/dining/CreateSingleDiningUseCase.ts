import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface CreateSingleDiningUseCase extends UseCase<CreateSingleDiningUseCase.Request, CreateSingleDiningUseCase.Response> {
    execute(request: CreateSingleDiningUseCase.Request): Promise<CreateSingleDiningUseCase.Response>;
}

export namespace CreateSingleDiningUseCase {
    export const token = Symbol('CreateSingleDiningUseCase') as InjectionToken<CreateSingleDiningUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly activityId: string, readonly ticketPriceMinor: number, readonly categoryId: string, readonly replaceActivityId?: string) {
            super({scopeId: activityId, roomId: null});
            UseCase.id(activityId);
            if (replaceActivityId !== undefined) UseCase.id(replaceActivityId);
            UseCase.id(categoryId);
            UseCase.amount(ticketPriceMinor, true);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Dining.Session;

        constructor(value: Dining.Session) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
