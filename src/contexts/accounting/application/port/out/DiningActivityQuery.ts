import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import type {Accounting} from '../in/Accounting';

export interface DiningActivityQuery {
    getById(id: string): Accounting.Activity | undefined;

    list(): readonly Accounting.Activity[];
}

export namespace DiningActivityQuery {
    export const token = Symbol('DiningActivityQuery') as InjectionToken<DiningActivityQuery>;
}
