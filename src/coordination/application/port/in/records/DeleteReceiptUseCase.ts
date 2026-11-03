import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';

export interface DeleteReceiptUseCase extends UseCase<DeleteReceiptUseCase.Request, DeleteReceiptUseCase.Response> {
    execute(request: DeleteReceiptUseCase.Request): Promise<DeleteReceiptUseCase.Response>;
}

export namespace DeleteReceiptUseCase {
    export const token = Symbol('DeleteReceiptUseCase') as InjectionToken<DeleteReceiptUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly activityId: string) {
            super({scopeId: 'local-personal', roomId: null});
            UseCase.id(activityId);
        }
    }

    export class Response extends UseCase.Response {
    }
}
