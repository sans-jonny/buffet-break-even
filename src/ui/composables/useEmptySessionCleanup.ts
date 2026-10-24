import {DiscardSessionInput} from '@/contexts/dining/public'
import {useDiningStore} from '@/ui/stores/useDiningStore'
import {useApplicationStore} from '@/ui/stores/useApplicationStore'
import {useRequired} from './useRequired'
import {runAction} from './runAction'

/** 仅在返回首页或应用退出边界调用，普通页面切换不关闭用餐。 */
export function useEmptySessionCleanup() {
    const dining = useDiningStore(), application = useApplicationStore()
    const discard = useRequired<DiscardSessionInput>(DiscardSessionInput.Token)
    return () => runAction(() => {
        const session = dining.view.session
        if (application.ready && session.active && session.diningMode === '单人'
            && !session.hasAnyDraft && !dining.view.totalSelectedCount && !session.rounds.length) {
            discard.execute({sessionId:session.id})
        }
    })
}
