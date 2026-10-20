export interface LoadCollectionInput {
    execute(request: LoadCollectionInput.Request): void
}

export namespace LoadCollectionInput {
    export const Token = Symbol('LoadCollectionInput')

    export class Request {
    }
}
