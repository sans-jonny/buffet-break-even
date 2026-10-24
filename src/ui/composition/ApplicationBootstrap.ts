import type {LoadDiningInput, LoadHistoryInput, LoadCollectionInput} from '@/contexts/dining/public'
import type {ApplicationView} from '@/presentation/shared/ApplicationView'
import type {ProfileSettings} from '@/ui/profile/ProfileSettings'

/** 本地同步初始化。全部投影生成成功后才发布；失败保留原展示状态并允许重试。 */
export class ApplicationBootstrap {
    static readonly Token = Symbol('ApplicationBootstrap')

    constructor(private readonly loads: {
        dining: LoadDiningInput; history: LoadHistoryInput; collection: LoadCollectionInput
        profile?: ProfileSettings
        identity?: {load(): string}
    }, private readonly transaction: <T>(work: () => T) => T,
                private readonly output: ApplicationView) {}

    initialize(): boolean {
        try {
            this.transaction(() => {
                this.loads.dining.execute({})
                this.loads.history.execute({})
                this.loads.collection.execute({})
            })
            this.loads.identity?.load()
            this.loads.profile?.load()
            this.output.present({status: 'ready', message: ''})
            return true
        } catch (error) {
            this.output.present({status: 'error', message: error instanceof Error ? error.message : '读取用餐数据失败，请重试'})
            return false
        }
    }
}
