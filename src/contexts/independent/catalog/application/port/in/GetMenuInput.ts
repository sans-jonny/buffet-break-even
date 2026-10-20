export interface GetMenuInput {
    execute(request: GetMenuInput.Request): GetMenuInput.Response
}

export namespace GetMenuInput {
    export const Token = Symbol('GetMenuInput')

    export class Request {
        constructor(public category: string, public levels: string[]) {
        }
    }

    export class Response {
        constructor(public categories: string[],
                    public levels: string[],
                    public products: { id: string; name: string; category: string; level: string; price: number }[]) {
        }
    }
}
