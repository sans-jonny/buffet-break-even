import {TransactionRunner} from '../../kernel/application/TransactionRunner';
import {Transaction} from '../../kernel/application/Transaction';
import {Domain} from '../../kernel/domain/Domain';

/** Device-only records share the manifest queue, without inventing authoritative room events. */
export class LocalDataTransactionRunner implements TransactionRunner {
    private readonly workspaces = new WeakMap<Transaction.Context, Transaction.State>();

    constructor(private readonly storage: Transaction.Runner) {
    }

    async run<T>(scopeId: string, roomId: string | null, work: (tx: Transaction.Context) => Promise<T>): Promise<T> {
        Domain.require(roomId === null && scopeId === 'local-personal', 'LOCAL_SCOPE_REQUIRED');
        let result!: T;
        await this.storage.local(async (state) => {
            const tx: Transaction.Context = {
                phase: 'PREPARE', scopeId, roomId,
                get: <V>(key: string) => state[key] === undefined ? undefined : Domain.copy(state[key]) as V,
                entries: <V>(prefix: string) => Object.entries(state).filter(([key]) => key.startsWith(prefix)).map(([, value]) => Domain.copy(value) as V),
                stage: async () => {
                    throw new Error('LOCAL_DATA_ONLY');
                }
            };
            this.workspaces.set(tx, state);
            try {
                result = await work(tx);
            } finally {
                this.workspaces.delete(tx);
            }
        });
        return result;
    }

    assertActive(tx: Transaction.Context, scopeId: string, roomId: string | null): void {
        Domain.require(this.workspaces.has(tx) && tx.scopeId === scopeId && tx.roomId === roomId, 'INVALID_TRANSACTION_CONTEXT');
    }

    state(tx: Transaction.Context): Transaction.State {
        this.assertActive(tx, tx.scopeId, tx.roomId);
        return this.workspaces.get(tx)!;
    }
}
