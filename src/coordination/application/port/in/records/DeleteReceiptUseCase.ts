import {UseCase} from '../../../../../kernel/application/UseCase';

export interface DeleteReceiptUseCase extends UseCase<DeleteReceiptUseCase.Request, DeleteReceiptUseCase.Response> {
    execute(request: DeleteReceiptUseCase.Request): Promise<DeleteReceiptUseCase.Response>;
}

export namespace DeleteReceiptUseCase {
    export const token = Symbol('DeleteReceiptUseCase') as UseCase.Token<DeleteReceiptUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor() {
            super({scopeId: 'local-personal', roomId: null});
        }
    }

    export class Response extends UseCase.Response {
    }
}
