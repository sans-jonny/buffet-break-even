export interface CreateRoomInput {
    execute(request: CreateRoomInput.Request): void
}

export namespace CreateRoomInput {
    export const Token = Symbol('CreateRoomInput')

    export class Request {
        constructor(public nickname: string) {
        }
    }
}
