import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface ListDiningActivitiesUseCase extends UseCase<ListDiningActivitiesUseCase.Request, ListDiningActivitiesUseCase.Response> {
    execute(request: ListDiningActivitiesUseCase.Request): ListDiningActivitiesUseCase.Response;
}

export namespace ListDiningActivitiesUseCase {
    export const token = Symbol('ListDiningActivitiesUseCase') as UseCase.Token<ListDiningActivitiesUseCase>;

    export class Request extends UseCase.Request {
        constructor() {
            super();
        }
    }

    export class Response extends UseCase.Response {
        readonly value: readonly Accounting.Activity[];

        constructor(value: readonly Accounting.Activity[]) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
