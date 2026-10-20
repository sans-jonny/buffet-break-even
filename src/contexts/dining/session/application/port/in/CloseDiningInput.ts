export interface CloseDiningInput {
    execute(request: CloseDiningInput.Request): void
}

export namespace CloseDiningInput {
    export const Token = Symbol('CloseDiningInput')

    export class Request {
        constructor(public sessionId: string) {
        }
    }
}
