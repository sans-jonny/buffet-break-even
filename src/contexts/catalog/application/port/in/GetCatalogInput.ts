export interface GetCatalogInput {
    execute(request: GetCatalogInput.Request): GetCatalogInput.Response
}

export namespace GetCatalogInput {
    export const Token = Symbol('GetCatalogInput')

    export class Request {}

    export class Response {
        constructor(public products: {
            id: string; name: string; category: string; level: string; price: number
        }[]) {}
    }
}
