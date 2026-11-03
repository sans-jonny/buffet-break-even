import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import {Collaboration} from './Collaboration';

export interface ListRoomsUseCase extends UseCase<ListRoomsUseCase.Request, ListRoomsUseCase.Response> {
    execute(request: ListRoomsUseCase.Request): ListRoomsUseCase.Response;
}

export namespace ListRoomsUseCase {
    export const token = Symbol('ListRoomsUseCase') as InjectionToken<ListRoomsUseCase>;

    export class Request extends UseCase.Request {
        constructor() {
            super();
        }
    }

    export class Response extends UseCase.Response {
        readonly value: readonly Collaboration.Room[];

        constructor(value: readonly Collaboration.Room[]) {
            super();
            this.value = UseCase.dto(value);
        }
    }
}
