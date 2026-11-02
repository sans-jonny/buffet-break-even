import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import {UseCase} from '../../../../../kernel/application/UseCase';
import type {Dining} from '../../../dto/Dining';

export interface GetPersonalDiningUseCase {
    execute(): GetPersonalDiningUseCase.Response;
}

export namespace GetPersonalDiningUseCase {
    export const token = Symbol('GetPersonalDiningUseCase') as InjectionToken<GetPersonalDiningUseCase>;
    export type Response = Readonly<{
        identity: Dining.Identity | undefined;
        session: Dining.Session | undefined;
        receipt: Dining.Result | undefined;
        history: readonly Dining.Result[];
    }>;
}
