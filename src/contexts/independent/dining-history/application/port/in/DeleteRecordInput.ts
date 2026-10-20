export interface DeleteRecordInput {
    execute(request: DeleteRecordInput.Request): void
}

export namespace DeleteRecordInput {
    export const Token = Symbol('DeleteRecordInput')

    export class Request {
        constructor(public recordId: string) {
        }
    }
}
