import {Domain} from '../../kernel/domain/Domain';

/** Adapter-owned mutable representation; never shared with a domain instance. */
export namespace PersistedRecord {
    export type Mutable<T> = T extends readonly (infer E)[] ? Mutable<E>[] : T extends object ? {
        -readonly [K in keyof T]: Mutable<T[K]>;
    } : T;

    export function copy<T>(value: T): Mutable<T> {
        return Domain.copy(value) as Mutable<T>;
    }
}
