export interface ChangeSelectionInput {
    execute(request: ChangeSelectionInput.Request): void
}

export namespace ChangeSelectionInput {
    export const Token = Symbol('ChangeSelectionInput')

    export class Request {
        constructor(public productId: string, public change: 1 | -1) {
        }
    }
}
