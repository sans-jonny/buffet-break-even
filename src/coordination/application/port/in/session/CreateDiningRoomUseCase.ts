import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import type {Dining} from '../../../dto/Dining';

export interface CreateDiningRoomUseCase extends UseCase<CreateDiningRoomUseCase.Request, CreateDiningRoomUseCase.Response> {
    execute(request: CreateDiningRoomUseCase.Request): Promise<CreateDiningRoomUseCase.Response>;
}

export namespace CreateDiningRoomUseCase {
    export const token = Symbol('CreateDiningRoomUseCase') as InjectionToken<CreateDiningRoomUseCase>;
    export class Request extends UseCase.Request {
        constructor(readonly ticketPriceMinor: number, readonly categoryId: string) { super(); UseCase.amount(ticketPriceMinor, true); UseCase.id(categoryId); }
    }
    export class Response extends UseCase.Response {
        readonly value: Dining.Session;
        constructor(value: Dining.Session) { super(); this.value = UseCase.dto(value); }
    }
}
