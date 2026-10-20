export interface JoinRoomInput {
    execute(request: JoinRoomInput.Request): void
}

export namespace JoinRoomInput {
    export const Token = Symbol('JoinRoomInput')

    export class Request {
        constructor(public roomCode: string, public nickname: string) {
        }
    }
}
