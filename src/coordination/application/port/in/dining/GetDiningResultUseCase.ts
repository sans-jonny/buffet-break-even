import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface GetDiningResultUseCase extends UseCase<GetDiningResultUseCase.Request, GetDiningResultUseCase.Response> {
    execute(request: GetDiningResultUseCase.Request): GetDiningResultUseCase.Response;
}

export namespace GetDiningResultUseCase {
    export const token = Symbol('GetDiningResultUseCase') as UseCase.Token<GetDiningResultUseCase>;

    export class Request extends UseCase.Request {
        constructor(readonly session: Dining.Session,
                    readonly actor: Dining.Identity,
                    readonly restaurantId: string,
                    readonly date: string) {
            super();
            UseCase.id(restaurantId);
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
