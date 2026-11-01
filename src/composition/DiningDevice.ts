import type {App} from 'vue';
import {Buffet} from './Buffet';
import {ReferenceDiningCatalog} from './ReferenceDiningCatalog';
import {DiningSessionWorkflow} from '../coordination/application/workflow/DiningSessionWorkflow';
import type {DiningSessions} from '../coordination/application/port/in/DiningSessions';
import type {DiningPreferences} from '../coordination/application/port/out/DiningPreferences';
import {StorageDiningPreferences} from '../infrastructure/storage/StorageDiningPreferences';
import {ManagedRoomConnection} from '../infrastructure/event-store/ManagedRoomConnection';

/** Composition root for one device: infrastructure remains outside the UI adapter. */
export namespace DiningDevice {
    export function create(baseUrl: string, id: () => string, changed: () => void,
                           report: (error: unknown) => void, vueApp?: App) {
        const relay = Buffet.relay(baseUrl);
        const {dining, runtime} = Buffet.create({
            storage: Buffet.uniStorage(), id, now: () => new Date().toISOString(), remote: relay
        }, vueApp);
        const preferences: DiningPreferences = new StorageDiningPreferences(runtime);
        const connection = new ManagedRoomConnection(relay, runtime, runtime, report);
        const sessions: DiningSessions = new DiningSessionWorkflow(dining, preferences, relay, connection, ReferenceDiningCatalog.restaurants());
        runtime.subscribe(changed);
        return {dining, preferences, sessions, stopRoomWatching: () => connection.stop()};
    }
}
