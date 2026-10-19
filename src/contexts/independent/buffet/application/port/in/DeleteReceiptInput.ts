export interface DeleteReceiptInput {
    execute(request: DeleteReceiptInput.Request): void
}

export namespace DeleteReceiptInput {
    export const Token = Symbol('DeleteReceiptInput')

    export class Request {
        constructor(public receiptId: string) {
        }
    }
}
