import {UseCase} from '../../../../../kernel/application/UseCase';
import {Dining} from '../../../dto/Dining';

export interface ChangeDiningTicketPriceUseCase extends UseCase<ChangeDiningTicketPriceUseCase.Request, ChangeDiningTicketPriceUseCase.Response> {
    execute(request: ChangeDiningTicketPriceUseCase.Request): Promise<ChangeDiningTicketPriceUseCase.Response>;
}

export namespace ChangeDiningTicketPriceUseCase {
    export const token = Symbol('ChangeDiningTicketPriceUseCase') as UseCase.Token<ChangeDiningTicketPriceUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly session: Dining.Session, readonly actorId: string, readonly ticketPriceMinor: number) {
            super(session);
            UseCase.id(actorId);
            UseCase.amount(ticketPriceMinor, true);
            this.session = UseCase.dto(session);
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
