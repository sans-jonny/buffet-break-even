import type {InjectionToken} from '../../../../../kernel/application/InjectionToken';
import type {Accounting} from '../in/Accounting';

export interface ConsumptionQuery {
    getById(id: string): Accounting.Consumption | undefined;

    list(): readonly Accounting.Consumption[];
}

export namespace ConsumptionQuery {
    export const token = Symbol('ConsumptionQuery') as InjectionToken<ConsumptionQuery>;
}
