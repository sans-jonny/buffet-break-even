export interface ChangeRoomSelectionInput {
    execute(request: ChangeRoomSelectionInput.Request): void
}

export namespace ChangeRoomSelectionInput {
    export const Token = Symbol('ChangeRoomSelectionInput')

    export class Request {
        constructor(public productId: string, public change: 1 | -1) {
        }
    }
}
