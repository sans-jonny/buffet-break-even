export interface RenameInput {
    execute(request: RenameInput.Request): void
}

export namespace RenameInput {
    export const Token = Symbol('RenameInput')

    export class Request {
        constructor(public nickname: string) {
        }
    }
}
