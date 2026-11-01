import {UseCase} from '../../../../../kernel/application/UseCase';

export interface AuthorizeCatalogSyncUseCase extends UseCase<AuthorizeCatalogSyncUseCase.Request, AuthorizeCatalogSyncUseCase.Response> {
    execute(request: AuthorizeCatalogSyncUseCase.Request): AuthorizeCatalogSyncUseCase.Response;
}

export namespace AuthorizeCatalogSyncUseCase {
    export const token = Symbol('AuthorizeCatalogSyncUseCase') as UseCase.Token<AuthorizeCatalogSyncUseCase>;

    export class Request extends UseCase.Request {
        constructor(readonly roomId: string, readonly memberId: string, readonly sourceId: string) {
            super();
            UseCase.id(roomId);
            UseCase.id(memberId);
            UseCase.id(sourceId);
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
