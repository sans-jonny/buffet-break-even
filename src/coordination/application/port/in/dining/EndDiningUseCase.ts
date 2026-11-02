import {InvalidRequestError} from '../../../../../kernel/application/InvalidRequestError';
import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface EndDiningUseCase extends UseCase<EndDiningUseCase.Request, EndDiningUseCase.Response> {
    execute(request: EndDiningUseCase.Request): Promise<EndDiningUseCase.Response>;
}

export namespace EndDiningUseCase {
    export const token = Symbol('EndDiningUseCase') as InjectionToken<EndDiningUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly session: Dining.Session,
                    readonly actor: Dining.Identity,
                    readonly finalRestaurantId: string) {
            super(session);
            UseCase.required(actor, 'IDENTITY_REQUIRED');
            UseCase.id(actor.id);
            if (typeof finalRestaurantId !== 'string' || !finalRestaurantId.trim()) throw new InvalidRequestError('FINAL_RESTAURANT_REQUIRED');
            this.session = UseCase.dto(session);
            this.actor = UseCase.dto(actor);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Dining.Result;

        constructor(value: Dining.Result) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
