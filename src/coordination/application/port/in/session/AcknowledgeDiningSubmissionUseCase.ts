import {UseCase} from '../../../../../kernel/application/UseCase';

export interface AcknowledgeDiningSubmissionUseCase extends UseCase<AcknowledgeDiningSubmissionUseCase.Request, AcknowledgeDiningSubmissionUseCase.Response> {
    execute(request: AcknowledgeDiningSubmissionUseCase.Request): Promise<AcknowledgeDiningSubmissionUseCase.Response>;
}

export namespace AcknowledgeDiningSubmissionUseCase {
    export const token = Symbol('AcknowledgeDiningSubmissionUseCase') as UseCase.Token<AcknowledgeDiningSubmissionUseCase>;
    export class Request extends UseCase.Request {

    }
    export class Response extends UseCase.Response {
    }
}
