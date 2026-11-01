import {UseCase} from '../../../../../kernel/application/UseCase';
import {Accounting} from './Accounting';

export interface ChangeTicketPriceUseCase extends UseCase<ChangeTicketPriceUseCase.Request, ChangeTicketPriceUseCase.Response> {
    execute(request: ChangeTicketPriceUseCase.Request): Promise<ChangeTicketPriceUseCase.Response>;
}

export namespace ChangeTicketPriceUseCase {
    export const token = Symbol('ChangeTicketPriceUseCase') as UseCase.Token<ChangeTicketPriceUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(scope: UseCase.Scope, readonly activityId: string, readonly ticketPriceMinor: number) {
            super(scope);
            UseCase.id(activityId);
            UseCase.amount(ticketPriceMinor, true);
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
