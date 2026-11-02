import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface ReconcileConsumptionUseCase extends UseCase<ReconcileConsumptionUseCase.Request, ReconcileConsumptionUseCase.Response> {
    execute(request: ReconcileConsumptionUseCase.Request): Promise<ReconcileConsumptionUseCase.Response>;
}

export namespace ReconcileConsumptionUseCase {
    export const token = Symbol('ReconcileConsumptionUseCase') as InjectionToken<ReconcileConsumptionUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope, readonly activityId: string, readonly catalog: Accounting.Catalog) {
            super(scope);
            UseCase.id(activityId);
            UseCase.id(catalog.id);
            this.catalog = UseCase.dto(catalog);
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
