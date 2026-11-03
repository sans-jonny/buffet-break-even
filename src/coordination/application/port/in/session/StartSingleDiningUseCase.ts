import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import type {Dining} from '../../../dto/Dining';

export interface StartSingleDiningUseCase extends UseCase<StartSingleDiningUseCase.Request, StartSingleDiningUseCase.Response> {
    execute(request: StartSingleDiningUseCase.Request): Promise<StartSingleDiningUseCase.Response>;
}

export namespace StartSingleDiningUseCase {
    export const token = Symbol('StartSingleDiningUseCase') as InjectionToken<StartSingleDiningUseCase>;
    export class Request extends UseCase.Request {
        constructor(readonly ticketPriceMinor: number, readonly categoryId: string, readonly replaceActivityId?: string) {
            super(); UseCase.amount(ticketPriceMinor, true);
            UseCase.id(categoryId);
            if (replaceActivityId !== undefined) UseCase.id(replaceActivityId);
        }
    }
    export class Response extends UseCase.Response {
        readonly value: Dining.Session;
        constructor(value: Dining.Session) { super(); this.value = UseCase.dto(value); }
    }
}
