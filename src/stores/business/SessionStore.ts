import {UniAppUseCaseScope} from '../../composition/UniAppUseCaseScope';
import {StartSingleDiningUseCase} from '../../coordination/application/port/in/session/StartSingleDiningUseCase';
import {ResumeSingleDiningUseCase} from '../../coordination/application/port/in/session/ResumeSingleDiningUseCase';
import {CreateDiningRoomUseCase} from '../../coordination/application/port/in/session/CreateDiningRoomUseCase';
import {JoinDiningRoomUseCase} from '../../coordination/application/port/in/session/JoinDiningRoomUseCase';
import {RefreshDiningSessionUseCase} from '../../coordination/application/port/in/session/RefreshDiningSessionUseCase';
import {LeaveDiningSessionUseCase} from '../../coordination/application/port/in/session/LeaveDiningSessionUseCase';
import {AcknowledgeDiningSubmissionUseCase} from '../../coordination/application/port/in/session/AcknowledgeDiningSubmissionUseCase';
import {computed, ref} from 'vue';
import {defineStore, type Pinia} from 'pinia';
import type {Dining} from '../../coordination/application/dto/Dining';
import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {QueryClientProvider} from '../../infrastructure/query/QueryClientProvider';

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
            const pending = ref(0), error = ref<unknown>(null);
            async function command<T>(work: () => Promise<T>): Promise<T> {
                pending.value++; error.value = null;
                try { const response = await work(); await queries.settled(); return response; }
                catch (failure) { error.value = failure; throw failure; }
                finally { pending.value--; }
            }
            return {
                loading: computed(() => pending.value > 0), error: computed(() => error.value),
                startSingle: (total: number, categoryId?: string, replaceActivityId?: string) => command(() => startSingleDining.execute(new StartSingleDiningUseCase.Request(total, categoryId, replaceActivityId))),
                resumeSingle: (session: Dining.Session) => command(() => resumeSingleDining.execute(new ResumeSingleDiningUseCase.Request(session))),
                createRoom: (total: number, categoryId: string) => command(() => createDiningRoom.execute(new CreateDiningRoomUseCase.Request(total, categoryId))),
                joinRoom: (code?: string) => command(() => joinDiningRoom.execute(new JoinDiningRoomUseCase.Request(code))),
                leaveRoom: () => command(() => leaveDiningSession.execute(new LeaveDiningSessionUseCase.Request())),
                acknowledgeSubmission: () => command(() => acknowledgeDiningSubmission.execute(new AcknowledgeDiningSubmissionUseCase.Request())),
                refresh: () => command(() => refreshDiningSession.execute(new RefreshDiningSessionUseCase.Request()))
            };
        })(pinia);
    }
}
