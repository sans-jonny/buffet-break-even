import {UseCase} from '../../../../kernel/application/UseCase';
import type {RoomQuery} from '../../application/port/out/RoomQuery';
import type {DiningRoomRepository} from '../../application/port/out/DiningRoomRepository';

export class StorageRoomQuery implements RoomQuery {
    constructor(private readonly repository: DiningRoomRepository) {
    }

    getById(id: string) {
        const aggregate = this.repository.findById(id);
        return UseCase.dto(aggregate?.snapshot());
    }

    list() {
        return UseCase.dto(this.repository.all().map(a => a.snapshot()));
    }
}
