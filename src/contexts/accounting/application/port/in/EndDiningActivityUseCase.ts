import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface EndDiningActivityUseCase extends UseCase<EndDiningActivityUseCase.Request, EndDiningActivityUseCase.Response> {
    execute(request: EndDiningActivityUseCase.Request): Promise<EndDiningActivityUseCase.Response>;
}

export namespace EndDiningActivityUseCase {
    export const token = Symbol('EndDiningActivityUseCase') as UseCase.Token<EndDiningActivityUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope,
                    readonly activityId: string,
                    readonly catalog: Accounting.Catalog,
                    readonly date: string,
                    readonly diners: Accounting.Result['diners']) {
            super(scope);
            UseCase.id(activityId);
            UseCase.id(catalog.id);
            this.catalog = UseCase.dto(catalog);
            this.diners = UseCase.dto(diners);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Accounting.Result;

        constructor(value: Accounting.Result) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
