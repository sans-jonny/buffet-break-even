import {Transaction} from '../../kernel/application/Transaction';
import {TransactionRunner} from '../../kernel/application/TransactionRunner';
import {Domain} from '../../kernel/domain/Domain';

/** Scoped dependency: repositories join an active unit or open their own short unit. */
export class RepositoryTransaction {
    constructor(private readonly committed: Transaction.View, private readonly runner: TransactionRunner) {
    }

    view(): Transaction.View {
        const view = this.runner.view;
        if (view && 'phase' in view) {
            const tx = view as Transaction.Context;
            this.runner.assertActive(tx, tx.scopeId, tx.roomId);
        }
        return view || this.committed;
    }

    run<T>(scopeId: string, roomId: string | null, work: (tx: Transaction.Context) => Promise<T>): Promise<T> {
        const view = this.view();
        if ('phase' in view) {
            const tx = view as Transaction.Context;
            this.runner.assertActive(tx, tx.scopeId, tx.roomId);
            return work(tx);
        }
        return this.runner.run(scopeId, roomId, work);
    }

    activityScope(activityId: string, shared = false): {
        scopeId: string;
        roomId: string | null;
    } {
        const view = this.view();
        if ('phase' in view) {
            const tx = view as Transaction.Context;
            return {scopeId: tx.scopeId, roomId: tx.roomId};
        }
        const room = view.entries<{
            id: string;
            activityId: string;
        }>('collaboration/room/').find(r => r.activityId === activityId);
        const activity = view.get<{
            mode: string;
        }>(`accounting/activity/${activityId}`);
        Domain.require(room || !(shared || activity?.mode === 'SHARED'), 'ROOM_SCOPE_REQUIRED');
        return {scopeId: room?.id || activityId, roomId: room?.id || null};
    }
}
