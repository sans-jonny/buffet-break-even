export interface QueryToken<P, S> {
    readonly id: symbol;
    readonly name: string;
    readonly types?: (params: P) => S;
}

export namespace QueryToken {
    export function create<P, S>(name: string): QueryToken<P, S> {
        return {id: Symbol(name), name};
    }
}
