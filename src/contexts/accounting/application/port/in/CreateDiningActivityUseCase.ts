import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {InvalidRequestError} from '../../../../../kernel/application/InvalidRequestError';
import {Accounting} from './Accounting';

export interface CreateDiningActivityUseCase extends UseCase<CreateDiningActivityUseCase.Request, CreateDiningActivityUseCase.Response> {
    execute(request: CreateDiningActivityUseCase.Request): Promise<CreateDiningActivityUseCase.Response>;
}

export namespace CreateDiningActivityUseCase {
    export const token = Symbol('CreateDiningActivityUseCase') as InjectionToken<CreateDiningActivityUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope,
                    readonly activityId: string,
                    readonly ticketPriceMinor: number,
                    readonly single: boolean,
                    readonly restaurantIds: readonly string[], readonly restaurantCategoryId: string,
                    readonly replaceActivityId?: string) {
            super(scope);
            UseCase.id(activityId);
            if (replaceActivityId !== undefined) UseCase.id(replaceActivityId);
            UseCase.amount(ticketPriceMinor, true);
            UseCase.id(restaurantCategoryId);
            if (!Array.isArray(restaurantIds) || !restaurantIds.length) throw new InvalidRequestError('INVALID_ACTIVITY_RESTAURANTS');
            restaurantIds.forEach(UseCase.id);
            this.restaurantIds = UseCase.dto(restaurantIds);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Accounting.Activity;

        constructor(value: Accounting.Activity) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
