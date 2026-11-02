import {computed, readonly} from 'vue';
import {defineStore, type Pinia} from 'pinia';
import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {Domain} from '../../kernel/domain/Domain';
import type {Dining} from '../../coordination/application/dto/Dining';
import type {UniAppUseCaseScope} from '../../composition/UniAppUseCaseScope';
import {QueryClientProvider} from '../../infrastructure/query/QueryClientProvider';
import {CommandState} from '../CommandState';
import {ChangeNicknameUseCase} from '../../coordination/application/port/in/device/ChangeNicknameUseCase';
import {SaveReceiptUseCase} from '../../coordination/application/port/in/records/SaveReceiptUseCase';
import {SaveDiningHistoryUseCase} from '../../coordination/application/port/in/records/SaveDiningHistoryUseCase';
import {DeleteReceiptUseCase} from '../../coordination/application/port/in/records/DeleteReceiptUseCase';
import {DeleteDiningHistoryUseCase} from '../../coordination/application/port/in/records/DeleteDiningHistoryUseCase';

/** Personal records receive explicit dining results and never depend on another Store. */
export namespace PersonalStore {
    export const token = Symbol('PersonalStore') as InjectionToken<ReturnType<typeof create>>;
    export function create(scope: Pick<UniAppUseCaseScope, 'resolve'>, queries: QueryClientProvider, pinia: Pinia) {
        return defineStore('personal', () => {
            const changeNickname = scope.resolve(ChangeNicknameUseCase.token);
            const saveReceipt = scope.resolve(SaveReceiptUseCase.token);
            const saveHistory = scope.resolve(SaveDiningHistoryUseCase.token);
            const deleteReceipt = scope.resolve(DeleteReceiptUseCase.token);
            const deleteHistory = scope.resolve(DeleteDiningHistoryUseCase.token);
            const commands = CommandState.create(queries);
            const receipt = () => queries.personal().receipt;
            const history = () => queries.personal().history.slice();
            return {
                loading: commands.loading, error: commands.error,
                identityData: computed(() => queries.personal().identity),
                receiptData: computed(receipt), historyData: computed(() => readonly(history())),
                receipt, history,
                nickname: (name: string) => commands.run(() => changeNickname.execute(new ChangeNicknameUseCase.Request(name))),
                saveReceipt: (result: Dining.Result) => commands.run(() => saveReceipt.execute(new SaveReceiptUseCase.Request(result))),
                saveHistory: (session: Dining.Session | undefined, result: Dining.Result | undefined) => commands.run(() => {
                    Domain.require(result, 'NO_FINISHED_RESULT');
                    Domain.require(session, 'NO_DINING_SESSION');
                    return saveHistory.execute(new SaveDiningHistoryUseCase.Request(session, result));
                }),
                deleteReceipt: () => commands.run(() => deleteReceipt.execute(new DeleteReceiptUseCase.Request())),
                deleteHistory: (id: string) => commands.run(() => deleteHistory.execute(new DeleteDiningHistoryUseCase.Request(id)))
            };
        })(pinia);
    }
}
