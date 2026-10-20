export interface BeginRoomInput {
    execute(request: BeginRoomInput.Request): void
}

export namespace BeginRoomInput {
    export const Token = Symbol('BeginRoomInput')

    export class Request {
        constructor(public ticketPrice: number) {
        }
    }
}
