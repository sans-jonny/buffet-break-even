import {Bootstrap} from './Bootstrap';

/** Compatibility entry point for headless clients. Bootstrap owns assembly. */
export namespace Buffet {
    export type Options = Bootstrap.Options;
    export const create = Bootstrap.create;
    export const uniStorage = Bootstrap.uniStorage;
    export const relay = Bootstrap.relay;
}
