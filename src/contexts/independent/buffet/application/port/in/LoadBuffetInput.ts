export interface LoadBuffetInput {
    execute(request: LoadBuffetInput.Request): void
}

export namespace LoadBuffetInput {
    export const Token = Symbol('LoadBuffetInput')

    export class Request {

    }
}
