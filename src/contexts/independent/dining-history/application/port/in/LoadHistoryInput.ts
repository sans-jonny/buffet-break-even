export interface LoadHistoryInput {
    execute(request: LoadHistoryInput.Request): void
}

export namespace LoadHistoryInput {
    export const Token = Symbol('LoadHistoryInput')

    export class Request {
    }
}
