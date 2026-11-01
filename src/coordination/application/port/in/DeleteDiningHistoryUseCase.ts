import {UseCase} from '../../../../kernel/application/UseCase';

export interface DeleteDiningHistoryUseCase extends UseCase<DeleteDiningHistoryUseCase.Request, DeleteDiningHistoryUseCase.Response> {
    execute(request: DeleteDiningHistoryUseCase.Request): Promise<DeleteDiningHistoryUseCase.Response>;
}

export namespace DeleteDiningHistoryUseCase {
    export const token = Symbol('DeleteDiningHistoryUseCase') as UseCase.Token<DeleteDiningHistoryUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly activityId: string) {
            super({scopeId: 'local-personal', roomId: null});
            UseCase.id(activityId);
        }
    }

    export class Response extends UseCase.Response {
    }
}
