import {UseCase} from '../../../kernel/application/UseCase';
import type {Dining} from '../dto/Dining';

/** Business creation/join succeeded; retry only personal selection, never the business command. */
export class DiningSelectionPendingError extends Error {
    readonly session: Dining.Session;
    constructor(session: Dining.Session, readonly failure: unknown) {
        super('SESSION_SELECTION_PENDING');
        this.session = UseCase.dto(session);
    }
}
