import {Bootstrap as ApplicationBootstrap} from '../../src/composition/Bootstrap';
import type {App} from 'vue';
import {QueryClientProvider} from './legacy/QueryClientProvider';
import {DiningStore} from './legacy/DiningStore';
import {CatalogStore} from './legacy/CatalogStore';
import {AccountingStore} from './legacy/AccountingStore';
import {CollaborationStore} from './legacy/CollaborationStore';
import {PersonalStore} from './legacy/PersonalStore';
import {SessionStore} from './legacy/SessionStore';
import {PublishLocalRestaurantUseCase} from '../../src/coordination/application/port/in/catalog/PublishLocalRestaurantUseCase';
import {DeleteLocalRestaurantUseCase} from '../../src/coordination/application/port/in/catalog/DeleteLocalRestaurantUseCase';

/** Existing scenarios retain their vocabulary while exercising production ports and queries. */
export namespace TestBootstrap {
    export type Options = ApplicationBootstrap.Options;
    export const start = ApplicationBootstrap.start;
    export const id = ApplicationBootstrap.id;
    export function attach(core: ReturnType<typeof ApplicationBootstrap.create>, headless = true) {
        core.queries.client.setDefaultOptions({queries: {...core.queries.client.getDefaultOptions().queries, gcTime: Infinity}});
        const queries = new QueryClientProvider(core.queries, () => core.invalidation.settled());
        const release = headless ? queries.acquire() : undefined;
        const dining = DiningStore.create(core as any, queries, core.pinia);
        const catalog = CatalogStore.create(queries, core.resolve(PublishLocalRestaurantUseCase.token), core.resolve(DeleteLocalRestaurantUseCase.token), core.pinia);
        const accounting = AccountingStore.create(queries, core.pinia);
        const collaboration = CollaborationStore.create(core as any, queries, core.pinia);
        const personal = PersonalStore.create(core as any, queries, core.pinia);
        return {...core, queries, dining, catalog, accounting, collaboration, personal,
            dispose: () => { release?.(); queries.dispose(); [dining, catalog, accounting, collaboration, personal].forEach(s => s.$dispose()); core.dispose(); }};
    }
    export function create(options: Options, app?: App) { return attach(ApplicationBootstrap.create(options, app), !app); }
    export async function device(...args: Parameters<typeof ApplicationBootstrap.device>) {
        const core = await ApplicationBootstrap.device(...args);
        const views = attach(core, false);
        const sessionStore = SessionStore.create(views, views.queries, views.pinia);
        return {...views, lifecycle: core.lifecycle, sessionStore,
            dispose: () => { sessionStore.$dispose(); views.dispose(); }};
    }
}
