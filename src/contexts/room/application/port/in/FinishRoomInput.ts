export interface FinishRoomInput {
    execute(): void
}

export namespace FinishRoomInput {
    export const Token = Symbol('FinishRoomInput')
}
