import {QueryToken} from './QueryToken';
import {QueryRegistry} from './QueryRegistry';
import type {UniAppUseCaseScope} from '../../composition/UniAppUseCaseScope';
import type {Dining} from '../../coordination/application/dto/Dining';
import {ListDiningActivitiesUseCase} from '../../contexts/accounting/application/port/in/ListDiningActivitiesUseCase';
import {ListRestaurantsUseCase} from '../../contexts/catalog/application/port/in/ListRestaurantsUseCase';
import {ListRoomsUseCase} from '../../contexts/collaboration/application/port/in/ListRoomsUseCase';
import {GetConsumptionUseCase} from '../../contexts/accounting/application/port/in/GetConsumptionUseCase';
import {GetPersonalDiningUseCase} from '../../coordination/application/port/in/device/GetPersonalDiningUseCase';
import {GetDiningResultUseCase} from '../../coordination/application/port/in/dining/GetDiningResultUseCase';

export namespace DiningQueries {
    export const Activities = QueryToken.create<Record<string, never>, ListDiningActivitiesUseCase.Response>('Activities');
    export const Restaurants = QueryToken.create<{scopeId: string}, ListRestaurantsUseCase.Response>('Restaurants');
    export const Rooms = QueryToken.create<Record<string, never>, ListRoomsUseCase.Response>('Rooms');
    export const Consumption = QueryToken.create<{activityId: string; restaurantId: string}, GetConsumptionUseCase.Response>('Consumption');
    export const Personal = QueryToken.create<Record<string, never>, GetPersonalDiningUseCase.Response>('Personal');
    export const Result = QueryToken.create<{session: Dining.Session; actor: Dining.Identity; restaurantId: string}, GetDiningResultUseCase.Response>('Result');
    export function register(registry: QueryRegistry, scope: Pick<UniAppUseCaseScope, 'resolve'>, now: () => string): void {
        registry.register(Activities, {synchronous: true, key: p => ['accounting', 'activities'], request: p => new ListDiningActivitiesUseCase.Request(),
            execute: request => scope.resolve(ListDiningActivitiesUseCase.token).execute(request),
            affected: (key, event) => { const keys = event.keys; return !keys.length || (key[0] === 'accounting' && key[1] === 'activities' && keys.some(k => k.startsWith('accounting/activity/'))); }});
        registry.register(Restaurants, {synchronous: true, key: p => ['catalog', p.scopeId], request: p => new ListRestaurantsUseCase.Request(p.scopeId, true),
            execute: request => scope.resolve(ListRestaurantsUseCase.token).execute(request),
            affected: (key, event) => { const keys = event.keys; return !keys.length || (key[0] === 'catalog' && keys.some(k => k.startsWith(`catalog/${key[1]}/restaurant/`) || k.startsWith('catalog/local/restaurant/'))); }});
        registry.register(Rooms, {synchronous: true, key: p => ['collaboration', 'rooms'], request: p => new ListRoomsUseCase.Request(),
            execute: request => scope.resolve(ListRoomsUseCase.token).execute(request),
            affected: (key, event) => { const keys = event.keys; return !keys.length || (key[0] === 'collaboration' && keys.some(k => k.startsWith('collaboration/room/'))); }});
        registry.register(Consumption, {synchronous: true, key: p => ['accounting', 'consumption', p.activityId, p.restaurantId], request: p => new GetConsumptionUseCase.Request(p.activityId, p.restaurantId),
            execute: request => scope.resolve(GetConsumptionUseCase.token).execute(request),
            affected: (key, event) => { const keys = event.keys; return !keys.length || (key[0] === 'accounting' && key[1] === 'consumption' && keys.includes(`accounting/consumption/${key[2]}/${key[3]}`)); }});
        registry.register(Personal, {synchronous: true, key: p => ['coordination', 'personal'], request: p => undefined,
            execute: request => scope.resolve(GetPersonalDiningUseCase.token).execute(),
            affected: (key, event) => { const keys = event.keys; return !keys.length || (key[0] === 'coordination' && key[1] === 'personal' && keys.some(k => k.startsWith('personal/'))); }});
        registry.register(Result, {synchronous: true, key: p => ['coordination', 'result', p.session, p.actor, p.restaurantId], request: p => new GetDiningResultUseCase.Request(p.session, p.actor, p.restaurantId, now()),
            execute: request => scope.resolve(GetDiningResultUseCase.token).execute(request),
            affected: (key, event) => { const keys = event.keys; return !keys.length || (key[0] === 'coordination' && key[1] === 'result' && keys.some(k => { const session = key[2] as Dining.Session; return k === `accounting/activity/${session.activityId}` || k === `accounting/consumption/${session.activityId}/${key[4]}` || k === `catalog/${session.roomId || 'local'}/restaurant/${key[4]}` || k === `catalog/local/restaurant/${key[4]}` || k === `collaboration/room/${session.roomId}` || k === 'personal/identity'; })); }});
    }
}
