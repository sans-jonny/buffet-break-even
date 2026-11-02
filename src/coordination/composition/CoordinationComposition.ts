import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {TransactionRunner} from '../../kernel/application/TransactionRunner';
import {UniAppUseCaseScope} from '../../composition/UniAppUseCaseScope';
import {DiningComposition} from './DiningComposition';
import {CatalogCoordinationComposition} from './CatalogCoordinationComposition';
import {DeviceComposition} from './DeviceComposition';
import {SessionComposition} from './SessionComposition';

/** Registers lazy factories by responsibility; transaction scopes instantiate only what they use. */
export namespace CoordinationComposition {
    export function register(scope: UniAppUseCaseScope, options: {id: () => string; now: () => string}, personalRunner: InjectionToken<TransactionRunner>): void {
        DiningComposition.register(scope, options);
        CatalogCoordinationComposition.register(scope);
        DeviceComposition.register(scope, options, personalRunner);
    }

    export function registerSessions(scope: Pick<UniAppUseCaseScope, 'provide' | 'resolve'>, id: () => string): void {
        SessionComposition.register(scope, id);
    }
}
