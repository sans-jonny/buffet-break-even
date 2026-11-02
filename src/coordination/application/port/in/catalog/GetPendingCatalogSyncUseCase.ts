import {UseCase} from '../../../../../kernel/application/UseCase';
import type {CatalogSynchronization} from '../../../dto/CatalogSynchronization';

export interface GetPendingCatalogSyncUseCase extends UseCase<GetPendingCatalogSyncUseCase.Request, GetPendingCatalogSyncUseCase.Response> {
    execute(request: GetPendingCatalogSyncUseCase.Request): GetPendingCatalogSyncUseCase.Response;
}

export namespace GetPendingCatalogSyncUseCase {
    export const token = Symbol('GetPendingCatalogSyncUseCase') as UseCase.Token<GetPendingCatalogSyncUseCase>;
    export class Request extends UseCase.Request {
        constructor(readonly actorId: string) { super(); UseCase.id(actorId); }
    }
    export class Response extends UseCase.Response {
        readonly value: readonly CatalogSynchronization.Pending[];
        constructor(value: readonly CatalogSynchronization.Pending[]) { super(); this.value = UseCase.dto(value); }
    }
}
