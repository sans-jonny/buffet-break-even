export interface SaveDiningReceiptInput {
    execute(request: SaveDiningReceiptInput.Request): SaveDiningReceiptInput.Response
}

export namespace SaveDiningReceiptInput {
    export const Token = Symbol('SaveDiningReceiptInput')
    export class Request {
        /** Shared dining supplies its authoritative projected snapshot; single dining is read by the use case. */
        constructor(public receipt?: {
            participants?: string[];
            restaurantId?: string; typeId?: string; typeName?: string;
            id: string; restaurant: string; date: string; price: number; value: number;
            lines: {name: string; count: number; price: number}[];
            rounds: {time: string; value: number; lines: {name: string; count: number; price: number}[]}[]
        }) {}
    }
    export class Response {
        constructor(public saved: boolean, public receiptId: string | null) {}
    }
}
