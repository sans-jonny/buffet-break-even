import {CommandState} from '../../../src/stores/CommandState';
import {UniAppUseCaseScope} from '../../../src/composition/UniAppUseCaseScope';
import {StartSingleDiningUseCase} from '../../../src/coordination/application/port/in/session/StartSingleDiningUseCase';
import {ResumeSingleDiningUseCase} from '../../../src/coordination/application/port/in/session/ResumeSingleDiningUseCase';
import {CreateDiningRoomUseCase} from '../../../src/coordination/application/port/in/session/CreateDiningRoomUseCase';
import {JoinDiningRoomUseCase} from '../../../src/coordination/application/port/in/session/JoinDiningRoomUseCase';
import {RefreshDiningSessionUseCase} from '../../../src/coordination/application/port/in/session/RefreshDiningSessionUseCase';
import {LeaveDiningSessionUseCase} from '../../../src/coordination/application/port/in/session/LeaveDiningSessionUseCase';
import {AcknowledgeDiningSubmissionUseCase} from '../../../src/coordination/application/port/in/session/AcknowledgeDiningSubmissionUseCase';
import {defineStore, type Pinia} from 'pinia';
import type {Dining} from '../../../src/coordination/application/dto/Dining';
import type {InjectionToken} from '../../../src/kernel/application/InjectionToken';
import {QueryClientProvider} from './QueryClientProvider';
import {computed, shallowRef} from 'vue';
import {Domain} from '../../../src/kernel/domain/Domain';
import {DiningSelectionPendingError} from '../../../src/coordination/application/service/DiningSelectionPendingError';
import {RecoverDiningSelectionUseCase} from '../../../src/coordination/application/port/in/session/RecoverDiningSelectionUseCase';
import {AbandonEmptyDiningUseCase} from '../../../src/coordination/application/port/in/dining/AbandonEmptyDiningUseCase';
import {ClearDiningSessionUseCase} from '../../../src/coordination/application/port/in/device/ClearDiningSessionUseCase';

/** UI actions delegate session orchestration to the injected application entry point. */
export namespace SessionStore {
    export const token = Symbol('SessionStore') as InjectionToken<ReturnType<typeof create>>;
    export function create(scope: Pick<UniAppUseCaseScope, 'resolve'>, queries: QueryClientProvider, pinia: Pinia) {
        return defineStore('sessions', () => {
            const startSingleDining = scope.resolve(StartSingleDiningUseCase.token);
            const resumeSingleDining = scope.resolve(ResumeSingleDiningUseCase.token);
            const createDiningRoom = scope.resolve(CreateDiningRoomUseCase.token);
            const joinDiningRoom = scope.resolve(JoinDiningRoomUseCase.token);
            const refreshDiningSession = scope.resolve(RefreshDiningSessionUseCase.token);
            const leaveDiningSession = scope.resolve(LeaveDiningSessionUseCase.token);
            const acknowledgeDiningSubmission = scope.resolve(AcknowledgeDiningSubmissionUseCase.token);
            const recoverSelection = scope.resolve(RecoverDiningSelectionUseCase.token);
            const abandonEmpty = scope.resolve(AbandonEmptyDiningUseCase.token);
            const clearSession = scope.resolve(ClearDiningSessionUseCase.token);
            const commands = CommandState.create();
            const pendingSelection = shallowRef<Dining.Session>();
            let selecting = false;
            async function command<T>(work: () => Promise<T>): Promise<T> {
                return commands.run(async () => {
                    try { return await work(); }
                    catch (error) {
                        if (error instanceof DiningSelectionPendingError) pendingSelection.value = error.session;
                        throw error;
                    }
                });
            }
            function transition<T>(work: () => Promise<T>): Promise<T> {
                return command(async () => {
                    Domain.require(!selecting, 'SESSION_BUSY');
                    if (pendingSelection.value) throw new DiningSelectionPendingError(pendingSelection.value, undefined);
                    selecting = true;
                    try {
                        const response = await work();
                        pendingSelection.value = undefined;
                        return response;
                    } finally { selecting = false; }
                });
            }
            return {
                loading: commands.loading, error: commands.error,
                selectionPending: computed(() => pendingSelection.value),
                dismissSelectionRecovery: () => { if (!selecting) pendingSelection.value = undefined; },
                recoverSelection: () => command(async () => {
                    Domain.require(!selecting, 'SESSION_BUSY');
                    Domain.require(pendingSelection.value, 'NO_PENDING_SESSION');
                    selecting = true;
                    try {
                        const response = await recoverSelection.execute(new RecoverDiningSelectionUseCase.Request(pendingSelection.value));
                        pendingSelection.value = undefined;
                        return response;
                    } finally { selecting = false; }
                }),
                startSingle: (total: number, categoryId: string, replaceActivityId?: string) => transition(() => startSingleDining.execute(new StartSingleDiningUseCase.Request(total, categoryId, replaceActivityId))),
                resumeSingle: (session: Dining.Session) => transition(() => resumeSingleDining.execute(new ResumeSingleDiningUseCase.Request(session))),
                createRoom: (total: number, categoryId: string) => transition(() => createDiningRoom.execute(new CreateDiningRoomUseCase.Request(total, categoryId))),
                joinRoom: (code?: string) => transition(() => joinDiningRoom.execute(new JoinDiningRoomUseCase.Request(code))),
                leaveRoom: () => command(() => leaveDiningSession.execute(new LeaveDiningSessionUseCase.Request())),
                exitMenu: () => transition(async () => {
                    const {session, identity} = queries.personal();
                    if (!session || !identity) return;
                    if (session.roomId) {
                        await leaveDiningSession.execute(new LeaveDiningSessionUseCase.Request());
                        return;
                    }
                    let empty: boolean;
                    try {
                        empty = (await abandonEmpty.execute(new AbandonEmptyDiningUseCase.Request(session, identity.id))).empty;
                    } catch (error) {
                        if (!session.roomId || (error as Error).message !== 'REJECTED_404') throw error;
                        empty = true;
                    }
                    if (empty) {
                        await clearSession.execute(new ClearDiningSessionUseCase.Request());
                    }
                }),
                acknowledgeSubmission: () => command(() => acknowledgeDiningSubmission.execute(new AcknowledgeDiningSubmissionUseCase.Request())),
                refresh: () => command(() => refreshDiningSession.execute(new RefreshDiningSessionUseCase.Request()))
            };
        })(pinia);
    }
}
