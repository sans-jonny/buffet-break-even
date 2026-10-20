import type {App} from 'vue'
import type {Pinia} from 'pinia'
import {registerCatalog} from '@/contexts/independent/catalog/composition/registerCatalog'
import {registerDining} from '@/contexts/independent/dining/composition/registerDining'
import {registerHistory} from '@/contexts/independent/dining-history/composition/registerHistory'
import {registerCollection} from '@/contexts/independent/receipt-collection/composition/registerCollection'
import {registerCompleteDining} from '@/contexts/orchestration/complete-dining/composition/registerCompleteDining'
import {registerRoom} from '@/contexts/independent/room/composition/registerRoom'
import {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'
import {UniSnapshotStorage} from '@/infrastructure/persistence/UniSnapshotStorage'
import {BuffetNavigation} from '@/navigation/BuffetNavigation'
import {UniBuffetNavigation} from '@/navigation/UniBuffetNavigation'

export function registerApplication(app: App, pinia: Pinia): void {
    const database = new LocalDiningDatabase(new UniSnapshotStorage(uni))
    registerCatalog(app)
    const dining = registerDining(app, pinia, database)
    const history = registerHistory(app, pinia, database)
    const collection = registerCollection(app, pinia, database)
    registerCompleteDining(app, database, dining.prepareDiningCompletion, history.saveRecord, collection.collectReceipt, dining.closeDining)
    // 生产环境请改成 wss://你的域名/room（微信小程序要求 HTTPS + 备案域名，见 server/README.md）
    registerRoom(app, pinia, 'ws://localhost:3000/room')
    app.provide<BuffetNavigation>(BuffetNavigation, new UniBuffetNavigation(uni, () => getCurrentPages().length))
}
