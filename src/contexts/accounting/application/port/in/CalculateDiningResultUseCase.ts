import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface CalculateDiningResultUseCase extends UseCase<CalculateDiningResultUseCase.Request, CalculateDiningResultUseCase.Response> {
    execute(request: CalculateDiningResultUseCase.Request): CalculateDiningResultUseCase.Response;
}

export namespace CalculateDiningResultUseCase {
    export const token = Symbol('CalculateDiningResultUseCase') as InjectionToken<CalculateDiningResultUseCase>;

    export class Request extends UseCase.Request {
        constructor(readonly activityId: string,
                    readonly catalog: Accounting.Catalog,
                    readonly date: string,
                    readonly diners: Accounting.Result['diners']) {
            super();
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
