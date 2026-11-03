import type {InjectionToken} from '../../../kernel/application/InjectionToken';
import {DiningSelectionPendingError} from './DiningSelectionPendingError';
import type {Dining} from '../dto/Dining';

/** Serializes session transitions across all input adapters. */
export class SessionOperationCoordinator {
    static readonly token = Symbol('SessionOperationCoordinator') as InjectionToken<SessionOperationCoordinator>;
    private busy = false;
    private pending?: Dining.Session;

    async run<T>(work: () => T | Promise<T>, recovery = false): Promise<T> {
        if (this.busy) throw new Error('SESSION_BUSY');
        if (this.pending && !recovery) throw new DiningSelectionPendingError(this.pending, undefined);
        this.busy = true;
        try { const result = await work(); this.pending = undefined; return result; }
        catch (error) {
            if (error instanceof DiningSelectionPendingError) this.pending = error.session;
            throw error;
        } finally { this.busy = false; }
    }
}
