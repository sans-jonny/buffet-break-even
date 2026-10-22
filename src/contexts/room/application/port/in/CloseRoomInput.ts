export interface CloseRoomInput {
    execute(): void
}

export namespace CloseRoomInput {
    export const Token = Symbol('CloseRoomInput')
}
