import {UseCase} from '../../../../kernel/application/UseCase';
import {Dining} from './Dining';

export interface SaveReceiptUseCase extends UseCase<SaveReceiptUseCase.Request, SaveReceiptUseCase.Response> {
    execute(request: SaveReceiptUseCase.Request): Promise<SaveReceiptUseCase.Response>;
}

export namespace SaveReceiptUseCase {
    export const token = Symbol('SaveReceiptUseCase') as UseCase.Token<SaveReceiptUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly result: Dining.Result) {
            super({scopeId: 'local-personal', roomId: null});
            UseCase.id(result.activityId);
            this.result = UseCase.dto(result);
        }
    }

    export class Response extends UseCase.Response {
    }
}
