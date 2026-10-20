export interface CommitRoundInput {
    execute(request: CommitRoundInput.Request): CommitRoundInput.Response
}

export namespace CommitRoundInput {
    export const Token = Symbol('CommitRoundInput')

    export class Request {

    }

    export class Response {
        constructor(public committed: boolean, public roundCount: number) {
        }
    }
}
