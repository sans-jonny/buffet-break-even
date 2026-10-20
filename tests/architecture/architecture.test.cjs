const assert = require('node:assert/strict')
const test = require('node:test')
const path = require('node:path')
const {inspectSource, inspectProject} = require('../../scripts/check-architecture.cjs')
const rejected = (file, source) => assert.ok(inspectSource(file, source).length, `${file}: ${source}`)
const accepted = (file, source) => assert.deepEqual(inspectSource(file, source), [])

test('项目满足上下文、内部模块、端口和展示层边界', () => {
  assert.deepEqual(inspectProject(path.resolve(__dirname, '../../src')), [])
})

test('Vue 代码集中在 UI，业务与共享代码不反向依赖 UI', () => {
  accepted('ui/components/example.vue', '<script>import {ref} from "vue"</script>')
  rejected('components/example.vue', '<template><view /></template>')
  rejected('contexts/catalog/infrastructure/data/Example.ts', 'import {ref} from "vue"')
  rejected('infrastructure/example.ts', 'import {useDiningStore} from "@/ui/stores/useDiningStore"')
  rejected('presentation/example.ts', 'import type {BuffetNavigation} from "../ui/navigation/BuffetNavigation"')
})

test('页面仅访问上下文 API，覆盖相对路径、类型、动态导入和路径规范化', () => {
  const file = 'ui/pages/menu/index.vue'
  for (const source of [
    "import {DiningSession} from '@/contexts/dining/session/model/DiningSession'",
    "import type {DiningSession} from '../../../contexts/dining/session/model/DiningSession'",
    "type Session = import('../../../contexts/dining/session/model/DiningSession').DiningSession",
    "const module = import('@/contexts/dining/session/public')",
    "export {Product} from '@/contexts/catalog/../dining/session/model/snapshot/Product'",
    "const module = require('@/contexts/catalog/model/Product')",
    "import {useDiningStore} from '@/ui/stores/useDiningStore'",
  ]) rejected(file, `<script>${source}</script>`)
  accepted(file, '<script>import {BeginSessionInput} from "@/contexts/dining/public.ts"; void BeginSessionInput.Token</script>')
})

test('领域和应用层不依赖框架、基础设施及其他上下文', () => {
  for (const file of ['contexts/dining/session/model/Example.ts', 'contexts/dining/session/application/interactor/Example.ts']) {
    rejected(file, "import {ref} from 'vue'")
    rejected(file, "import {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'")
    rejected(file, "import {GetMenuInput} from '@/contexts/catalog/public'")
    rejected(file, "import {DiningHistory} from '@/contexts/dining/history/model/DiningHistory'")
    rejected(file, 'uni.getStorageSync("x")')
  }
  accepted('contexts/dining/session/application/interactor/Example.ts', "import {DiningSession} from '../../model/DiningSession'")
})

test('完成流程只通过内部 Input 协作，外部目录仅由适配器连接', () => {
  accepted('contexts/dining/completion/application/interactor/Example.ts', "import {SaveRecordInput} from '@/contexts/dining/history/public'")
  rejected('contexts/dining/completion/application/interactor/Example.ts', "import {DiningHistory} from '@/contexts/dining/history/model/DiningHistory'")
  rejected('contexts/dining/completion/model/Example.ts', 'export interface Example {}')
  accepted('contexts/dining/session/infrastructure/integration/Example.ts', "import {GetCatalogInput} from '@/contexts/catalog/public'")
  rejected('contexts/dining/session/infrastructure/integration/Example.ts', "import {Product} from '@/contexts/catalog/model/Product'")
  rejected('contexts/dining/session/infrastructure/integration/Example.ts', "import {products} from '@/data/catalog'")
})

test('保留 port/in、port/out 与 Input 内部类契约，不强制所有模块套领域层', () => {
  accepted('contexts/catalog/application/port/in/ExampleInput.ts', 'export interface ExampleInput {} export namespace ExampleInput { export class Request {} export class Response {} }')
  rejected('contexts/catalog/application/port/in/ExampleInput.ts', 'export class Request {}')
  rejected('contexts/catalog/application/port/in/ExampleRequest.ts', 'export class ExampleRequest {}')
  rejected('contexts/catalog/application/ExampleInput.ts', 'export interface ExampleInput {}')
  rejected('contexts/catalog/application/port/in/ExampleInput.ts', "import type {Product} from '../../../model/Product'")
  rejected('contexts/catalog/public.ts', "export {Product as ProductInput} from './model/Product'")
  accepted('contexts/dining/public.ts', "export {BeginSessionInput} from './session/public'")
  rejected('contexts/dining/session/application/interactor/Example.ts', 'export class Example {constructor(private state: State) {}}')
  accepted('contexts/dining/session/application/interactor/Example.ts', "import type {DiningReader} from '../port/out/DiningReader'; export class Example {constructor(private reader: DiningReader) {}}")
})

test('Store 与只读入口不承担业务，Presenter 不感知具体数据库', () => {
  rejected('ui/stores/example.ts', "import {DiningSession} from '@/contexts/dining/session/model/DiningSession'")
  rejected('ui/stores/example.ts', 'uni.getStorageSync("x")')
  accepted('ui/stores/example.ts', "import {defineStore} from 'pinia'; import type {DiningViewModel} from '@/presentation/dining/DiningViewModel'")
  rejected('ui/composables/useDiningView.ts', 'const store = getStore(); store.present({})')
  rejected('contexts/dining/history/infrastructure/presentation/Example.ts', "import type {LocalDiningDatabase} from '@/infrastructure/persistence/LocalDiningDatabase'")
  rejected('contexts/dining/history/infrastructure/presentation/Example.ts', "import {useHistoryStore} from '@/ui/stores/useHistoryStore'")
})
