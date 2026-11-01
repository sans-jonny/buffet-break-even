import {SerializedEvent} from './SerializedEvent';

export namespace Transaction {
    export type State = Record<string, unknown>;
    export type Invalidation = Readonly<{
        type: 'DataInvalidationEvent';
        keys: readonly string[];
    }>;

    export interface View {
        get<T>(key: string): T | undefined;

        entries<T>(prefix: string): readonly T[];
    }

    export interface Context extends View {
        readonly phase: 'PREPARE';
        readonly scopeId: string;
        readonly roomId: string | null;

        stage(event: SerializedEvent.Fact): Promise<void>;
    }

    export interface Runner extends View {
        run<T>(scopeId: string, roomId: string | null, work: (tx: Context) => Promise<T>): Promise<T>;

        assertActive(tx: Context, scopeId: string, roomId: string | null): void;

        local(work: (state: State) => void | Promise<void>): Promise<void>;

        subscribe(listener: (event: Invalidation) => void): () => void;
    }
}
