export interface CompleteDiningInput {
    execute(request: CompleteDiningInput.Request): CompleteDiningInput.Response
}

export namespace CompleteDiningInput {
    export const Token = Symbol('CompleteDiningInput')

    export class Request {
        constructor(public collectReceipt: boolean) {
        }
    }

    export class Response {
        constructor(public completed: boolean, public receiptId: string | null) {
        }
    }
}
