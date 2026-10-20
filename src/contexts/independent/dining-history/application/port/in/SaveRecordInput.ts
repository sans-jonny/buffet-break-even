export interface SaveRecordInput {
    execute(request: SaveRecordInput.Request): void
}

export namespace SaveRecordInput {
    export const Token = Symbol('SaveRecordInput')

    export class Request {
        constructor(public record: {
            id: string; restaurant: string; date: string; price: number; value: number;
            lines: { name: string; count: number; price: number }[];
            rounds: { time: string; value: number; lines: { name: string; count: number; price: number }[] }[]
        }) {
        }
    }
}
