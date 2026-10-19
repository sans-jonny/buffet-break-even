export interface BeginSessionInput {
    execute(request: BeginSessionInput.Request): void
}

export namespace BeginSessionInput {
    export const Token = Symbol('BeginSessionInput')

    export class Request {
        constructor(public ticketPrice: number, public diningMode: string, public replaceActive?: boolean) {
        }
    }
}
