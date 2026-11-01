import {UseCase} from '../../../../kernel/application/UseCase';
import {Dining} from './Dining';

export interface CreateMultiplayerDiningUseCase extends UseCase<CreateMultiplayerDiningUseCase.Request, CreateMultiplayerDiningUseCase.Response> {
    execute(request: CreateMultiplayerDiningUseCase.Request): Promise<CreateMultiplayerDiningUseCase.Response>;
}

export namespace CreateMultiplayerDiningUseCase {
    export const token = Symbol('CreateMultiplayerDiningUseCase') as UseCase.Token<CreateMultiplayerDiningUseCase>;

    export class Request extends UseCase.TransactionRequest {
        constructor(readonly roomId: string,
                    readonly code: string,
                    readonly activityId: string,
                    readonly creator: Dining.Identity,
                    readonly ticketPriceMinor: number, readonly categoryId?: string) {
            super({scopeId: roomId, roomId});
            UseCase.id(roomId);
            UseCase.id(activityId);
            if (categoryId !== undefined) UseCase.id(categoryId);
            UseCase.amount(ticketPriceMinor, true);
            this.creator = UseCase.dto(creator);
        }
    }

    export class Response extends UseCase.Response {
        readonly value: Dining.Session;

        constructor(value: Dining.Session) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
