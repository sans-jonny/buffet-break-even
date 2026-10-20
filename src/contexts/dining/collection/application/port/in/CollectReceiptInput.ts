export interface CollectReceiptInput {
    execute(request: CollectReceiptInput.Request): void
}

export namespace CollectReceiptInput {
    export const Token = Symbol('CollectReceiptInput')

    export class Request {
        constructor(public receipt: {
            id: string; restaurant: string; date: string; price: number; value: number;
            lines: { name: string; count: number; price: number }[];
            rounds: { time: string; value: number; lines: { name: string; count: number; price: number }[] }[]
        }) {
        }
    }
}
