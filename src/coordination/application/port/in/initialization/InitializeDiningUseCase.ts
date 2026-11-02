import {UseCase} from '../../../../../kernel/application/UseCase';
import type {Dining} from '../../../dto/Dining';

export interface InitializeDiningUseCase extends UseCase<InitializeDiningUseCase.Request, InitializeDiningUseCase.Response> {
    execute(request: InitializeDiningUseCase.Request): Promise<InitializeDiningUseCase.Response>;
}

export namespace InitializeDiningUseCase {
    export const token = Symbol('InitializeDiningUseCase') as UseCase.Token<InitializeDiningUseCase>;
    export class Request extends UseCase.Request {
        constructor(readonly referenceCatalog: readonly Dining.Restaurant[] = []) { super(); this.referenceCatalog = UseCase.dto(referenceCatalog); }
    }
    export class Response extends UseCase.Response {
    }
}
