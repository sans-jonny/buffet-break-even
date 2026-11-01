import type {Collaboration} from '../in/Collaboration';

export interface RoomQuery {
    getById(id: string): Collaboration.Room | undefined;

    list(): readonly Collaboration.Room[];
}

export namespace RoomQuery {
    export const token = Symbol('RoomQuery');
}
