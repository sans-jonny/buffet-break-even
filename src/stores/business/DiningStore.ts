import {CommandState} from '../CommandState';
import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {computed, readonly} from 'vue';
import {defineStore, type Pinia} from 'pinia';
import {UniAppUseCaseScope} from '../../composition/UniAppUseCaseScope';
import {QueryClientProvider} from '../../infrastructure/query/QueryClientProvider';
import {Domain} from '../../kernel/domain/Domain';
import {Dining} from '../../coordination/application/dto/Dining';
import {IncreaseDiningProductUseCase} from '../../coordination/application/port/in/dining/IncreaseDiningProductUseCase';
import {DecreaseDiningProductUseCase} from '../../coordination/application/port/in/dining/DecreaseDiningProductUseCase';
import {RemoveDiningProductUseCase} from '../../coordination/application/port/in/dining/RemoveDiningProductUseCase';
import {ClearDiningRoundUseCase} from '../../coordination/application/port/in/dining/ClearDiningRoundUseCase';
import {SubmitDiningRoundUseCase} from '../../coordination/application/port/in/dining/SubmitDiningRoundUseCase';
import {ChangeDiningTicketPriceUseCase} from '../../coordination/application/port/in/dining/ChangeDiningTicketPriceUseCase';
import {EndDiningUseCase} from '../../coordination/application/port/in/dining/EndDiningUseCase';
import {AbandonDiningUseCase} from '../../coordination/application/port/in/dining/AbandonDiningUseCase';

/** Current dining view and accounting commands. Other writes belong to their owning Store. */
export namespace DiningStore {
    export const token = Symbol('DiningStore') as InjectionToken<ReturnType<typeof create>>;
    export function create(scope: UniAppUseCaseScope, queries: QueryClientProvider, pinia: Pinia) {
        return defineStore('dining', () => {
            const increaseDiningProduct = scope.resolve(IncreaseDiningProductUseCase.token);
            const decreaseDiningProduct = scope.resolve(DecreaseDiningProductUseCase.token);
            const removeDiningProduct = scope.resolve(RemoveDiningProductUseCase.token);
            const clearDiningRound = scope.resolve(ClearDiningRoundUseCase.token);
            const submitDiningRound = scope.resolve(SubmitDiningRoundUseCase.token);
            const changeDiningTicketPrice = scope.resolve(ChangeDiningTicketPriceUseCase.token);
            const endDining = scope.resolve(EndDiningUseCase.token);
            const abandonDining = scope.resolve(AbandonDiningUseCase.token);
            const commands = CommandState.create(queries);
            const command = commands.run;

            function identity(): Dining.Identity { return queries.personal().identity!; }

            function session(): Dining.Session | undefined { return queries.personal().session; }

            function restaurants(): Dining.Restaurant[] {
                const ids = activity()?.restaurantIds;
                return queries.restaurants(session()?.roomId || 'local').filter(a => !a.deleted && (!ids || ids.includes(a.id)));
            }

            function activity() {
                return queries.activities().find(a => a.id === session()?.activityId);
            }

            function room() {
                return queries.rooms().find(a => a.id === session()?.roomId);
            }

            function consumption(id: string) {
                const activityId = session()?.activityId;
                return activityId ? queries.consumption(activityId, id) : undefined;
            }

            function unfinishedSingle(): Dining.Session | undefined {
                const a = queries.activities().find(a => a.mode === 'SINGLE' && a.status === 'ACTIVE');
                return a ? {scopeId: a.id, activityId: a.id, roomId: null} : undefined;
            }

            async function edit(restaurantId: string, action: 'add' | 'reduce' | 'remove' | 'clear', productId = '', quantity = 1) {
                const s = current(), actor = identity().id;
                if (action === 'add')
                    return await increaseDiningProduct.execute(new IncreaseDiningProductUseCase.Request(s, actor, restaurantId, productId, quantity));
                else if (action === 'reduce')
                    return await decreaseDiningProduct.execute(new DecreaseDiningProductUseCase.Request(s, actor, restaurantId, productId, quantity));
                else if (action === 'remove')
                    return await removeDiningProduct.execute(new RemoveDiningProductUseCase.Request(s, actor, restaurantId, productId));
                else
                    return await clearDiningRound.execute(new ClearDiningRoundUseCase.Request(s, actor, restaurantId));
            }

            async function submit(id: string) {
                return await submitDiningRound.execute(new SubmitDiningRoundUseCase.Request(current(), identity().id, id));
            }

            async function paying(total: number) {
                return await changeDiningTicketPrice.execute(new ChangeDiningTicketPriceUseCase.Request(current(), identity().id, total));
            }

            function preview(id: string): Dining.Result {
                return queries.result(current(), identity(), id);
            }

            async function finish(id: string) {
                return await endDining.execute(new EndDiningUseCase.Request(current(), identity(), id));
            }

            async function abandon() {
                return await abandonDining.execute(new AbandonDiningUseCase.Request(current(), identity().id));
            }

            function current(): Dining.Session {
                const s = session();
                Domain.require(s, 'NO_DINING_SESSION');
                return s;
            }

            return {
                loading: computed(() => commands.loading.value || queries.fetching.value),
                error: computed(() => commands.error.value ?? queries.error.value),
                identityData: computed(identity), sessionData: computed(session),
                restaurantsData: computed(() => readonly(restaurants())), activityData: computed(activity),
                roomData: computed(room),
                identity,
                session,
                restaurants,
                activity,
                room,
                consumption,
                unfinishedSingle,
                edit: (...args: Parameters<typeof edit>) => command(() => edit(...args)),
                submit: (...args: Parameters<typeof submit>) => command(() => submit(...args)),
                paying: (...args: Parameters<typeof paying>) => command(() => paying(...args)),
                preview,
                finish: (...args: Parameters<typeof finish>) => command(() => finish(...args)),
                abandon: (...args: Parameters<typeof abandon>) => command(() => abandon(...args)),
            };
        })(pinia);
    }
}
