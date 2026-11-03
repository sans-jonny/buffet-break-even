import {UniAppUseCaseScope} from '../../src/composition/UniAppUseCaseScope';
import type {InjectionToken} from '../../src/kernel/application/InjectionToken';
import {InitializeIdentityUseCase} from '../../src/coordination/application/port/in/device/InitializeIdentityUseCase';
import {TransactionRunner} from '../../src/kernel/application/TransactionRunner';
import {UseCaseTransactionRunner} from '../../src/infrastructure/dependency-injection/UseCaseTransactionRunner';
import type {Transaction} from '../../src/kernel/application/Transaction';
import {ReactiveQueryFacade} from '../../src/infrastructure/query/ReactiveQueryFacade';
import {DiningQueries} from '../../src/infrastructure/query/DiningQueries';
import {GetConsumptionUseCase} from '../../src/contexts/accounting/application/port/in/GetConsumptionUseCase';

/** Compiled by the scope specification, never executed. */
export namespace UniAppUseCaseScopeTypes {
    export function verify(scope: UniAppUseCaseScope, runner: UseCaseTransactionRunner, tx: Transaction.Context): void {
        const token = Symbol('Service') as InjectionToken<{name: string}>;
        scope.provide(token, {name: 'service'});
        scope.factory(token, () => ({name: 'lazy'}));
        // @ts-expect-error Factories must satisfy the token's service contract.
        scope.factory(token, () => ({name: 123}));
        const service = scope.resolve(token);
        const name: string = service.name;
        // @ts-expect-error The resolved value is inferred from the token, not any.
        const wrong: number = service.name;
        // @ts-expect-error An incompatible implementation cannot widen the token's service type.
        scope.provide(token, {name: 123});
        // @ts-expect-error Plain symbols carry no service contract.
        scope.resolve(Symbol('Untyped'));
        // @ts-expect-error Both registration and resolution require a typed token.
        scope.provide(Symbol('Untyped'), {name: 'service'});

        const useCase = scope.resolve(InitializeIdentityUseCase.token);
        const expectedUseCase: InitializeIdentityUseCase = useCase;
        // @ts-expect-error A use case has execute, not run.
        useCase.run();
        const transactions = scope.resolve(TransactionRunner.token);
        const expectedRunner: TransactionRunner = transactions;
        const scoped = runner.resolve(InitializeIdentityUseCase.token, tx);
        const expectedScoped: InitializeIdentityUseCase = scoped;
        const root: UniAppUseCaseScope = scope.resolve(UniAppUseCaseScope.token);
        const queries = scope.resolve(ReactiveQueryFacade.token);
        const binding = queries.bind(DiningQueries.Consumption, () => ({activityId: 'a', restaurantId: 'r'}));
        const response: GetConsumptionUseCase.Response | undefined = binding.data.value;
        // @ts-expect-error Query parameters are inferred from the token.
        queries.bind(DiningQueries.Consumption, () => ({activityId: 123, restaurantId: 'r'}));
        // @ts-expect-error All required query parameters must be present.
        queries.bind(DiningQueries.Consumption, () => ({activityId: 'a'}));
        // @ts-expect-error Pages cannot replace the response projection.
        binding.data.value = undefined;
        // @ts-expect-error Pages cannot replace query status.
        binding.status.value = 'success';
        void [root, response];
        void [name, wrong, expectedUseCase, expectedRunner, expectedScoped];
    }
}
