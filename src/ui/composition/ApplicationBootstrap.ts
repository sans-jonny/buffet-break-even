import type {LoadDiningInput, LoadHistoryInput, LoadCollectionInput} from '@/contexts/dining/public'
import type {InitializationView} from '@/presentation/shared/InitializationView'
import type {ViewStore} from '@/presentation/shared/ViewStore'

/** 本地同步初始化。全部投影生成成功后才发布；失败保留原展示状态并允许重试。 */
export class ApplicationBootstrap {
    static readonly Token = Symbol('ApplicationBootstrap')

    constructor(private readonly loads: {
        dining: LoadDiningInput; history: LoadHistoryInput; collection: LoadCollectionInput
    }, private readonly transaction: <T>(work: () => T) => T,
                private readonly output: ViewStore<InitializationView>) {}

    initialize(): boolean {
        try {
            this.transaction(() => {
                this.loads.dining.execute({})
                this.loads.history.execute({})
                this.loads.collection.execute({})
            })
            this.output.present({status: 'ready', message: ''})
            return true
        } catch (error) {
            this.output.present({status: 'error', message: error instanceof Error ? error.message : '读取用餐数据失败，请重试'})
            return false
        }
    }
}
