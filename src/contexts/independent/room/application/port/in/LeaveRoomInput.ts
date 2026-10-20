export interface LeaveRoomInput {
    execute(): void
}

export namespace LeaveRoomInput {
    export const Token = Symbol('LeaveRoomInput')
}
