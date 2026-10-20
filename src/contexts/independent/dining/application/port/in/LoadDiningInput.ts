export interface LoadDiningInput {
    execute(request: LoadDiningInput.Request): void
}

export namespace LoadDiningInput {
    export const Token = Symbol('LoadDiningInput')

    export class Request {

    }
}
