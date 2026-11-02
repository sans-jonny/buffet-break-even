import {UseCase} from '../../../../../kernel/application/UseCase';
import type {CatalogSynchronization} from '../../../dto/CatalogSynchronization';

export interface RetryCatalogSyncUseCase extends UseCase<RetryCatalogSyncUseCase.Request, RetryCatalogSyncUseCase.Response> {
    execute(request: RetryCatalogSyncUseCase.Request): Promise<RetryCatalogSyncUseCase.Response>;
}

export namespace RetryCatalogSyncUseCase {
    export const token = Symbol('RetryCatalogSyncUseCase') as UseCase.Token<RetryCatalogSyncUseCase>;
    export class Request extends UseCase.Request {
        constructor(readonly restaurantId: string, readonly actorId: string) {
            super(); UseCase.id(restaurantId); UseCase.id(actorId);
        }
    }
    export class Response extends UseCase.Response {
        readonly value: CatalogSynchronization.Result;
        constructor(value: CatalogSynchronization.Result) { super(); this.value = UseCase.dto(value); }
    }
}
