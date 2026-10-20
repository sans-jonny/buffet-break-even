export interface PrepareDiningCompletionInput {
    execute(request: PrepareDiningCompletionInput.Request): PrepareDiningCompletionInput.Response
}

export namespace PrepareDiningCompletionInput {
    export const Token = Symbol('PrepareDiningCompletionInput')

    export class Request {
    }

    export class Response {
        constructor(public result: {
            id: string; restaurant: string; date: string; price: number; value: number;
            lines: { name: string; count: number; price: number }[];
            rounds: { time: string; value: number; lines: { name: string; count: number; price: number }[] }[]
        } | null) {
        }
    }
}
