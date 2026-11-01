import {SerializedEvent} from '../../kernel/application/SerializedEvent'
import {Transaction} from '../../kernel/application/Transaction'
import {Domain} from '../../kernel/domain/Domain'
import {Accounting} from '../../contexts/accounting/application/port/in/Accounting'
import {Collaboration} from '../../contexts/collaboration/application/port/in/Collaboration'

/** Deterministic device-local projection of already-frozen entitlement and result facts. */
export namespace PersonalResults {
    export async function project(event: SerializedEvent.Fact, state: Transaction.State): Promise<void> {
        let result: Accounting.Result | undefined, scope: string | undefined
        if (event.type === 'DiningEnded') {
            const activity = state[event.key] as Accounting.Activity
            if (activity.mode === 'SINGLE') {
                result = activity.result;
                scope = activity.id
            }
        } else if (event.type === 'RoomEnded') {
            const room = state[event.key] as Collaboration.Room,
                identity = state['personal/identity'] as { id: string } | undefined
            if (identity && room.eligibleIds.includes(identity.id)) {
                result = (state[`accounting/activity/${room.activityId}`] as Accounting.Activity | undefined)?.result;
                scope = room.id
            }
        }
        if (result && scope) {
            const suffix = `${scope}/${result.activityId}`
            if (!state[`personal/history-deleted/${suffix}`]) state[`personal/history/${suffix}`] = Domain.copy(result)
        }
    }
}
