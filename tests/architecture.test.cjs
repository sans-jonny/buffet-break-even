const assert = require('node:assert/strict')
const test = require('node:test')
const path = require('node:path')
const { inspectSource, inspectProject } = require('../scripts/check-architecture.cjs')

test('项目满足 Context 边界、公开契约和单顶层声明约定', () => {
  assert.deepEqual(inspectProject(path.resolve(__dirname, '../src')), [])
})

test('守卫覆盖别名、相对路径、类型引用及动态导入，拒绝深层导入', () => {
  for (const source of [
    "import type { Receipt } from '@/contexts/independent/buffet/domain/Receipt'",
    "import type { Receipt } from '../../contexts/independent/buffet/domain/Receipt'",
    "type Receipt = import('../../contexts/independent/buffet/domain/Receipt').Receipt",
    "const module = import('../../contexts/independent/buffet/adapter/persistence/UniBuffetGateway')",
  ]) assert.ok(inspectSource('pages/menu/index.vue', `<script setup lang="ts">${source}</script>`).length)
  assert.deepEqual(inspectSource('pages/menu/index.vue', '<script>import { GetMenuInput } from "@/contexts/independent/catalog/public"</script>'), [])
})

test('独立用例互相隔离，协调用例只允许公开入口，公开契约不泄露 Domain', () => {
  const independent = 'contexts/independent/buffet/application/interactor/Example.ts'
  const orchestration = 'contexts/orchestration/checkout/application/interactor/Example.ts'
  const publicImport = "import { GetMenuInput } from '@/contexts/independent/catalog/public'"
  assert.ok(inspectSource(independent, publicImport).length)
  assert.deepEqual(inspectSource(orchestration, publicImport), [])
  assert.ok(inspectSource(orchestration, "import { Product } from '@/contexts/independent/catalog/domain/Product'").length)
  assert.ok(inspectSource('contexts/independent/buffet/public.ts', "export { BuffetState } from './application/BuffetState'").length)
  assert.ok(inspectSource('contexts/independent/buffet/public.ts', 'export class Internal {}').length)
  assert.ok(inspectSource('contexts/independent/buffet/application/port/in/ExampleResponse.ts', "import type { Receipt } from '../../../domain/Receipt'").length)
  assert.ok(inspectSource(independent, 'export class A {} export interface B {}').length)
  assert.ok(inspectSource('stores/example.ts', 'uni.request({})').length)
})

test('Interactor 拒绝合并状态对象，允许直接注入最小输出端口', () => {
  const file = 'contexts/independent/buffet/application/interactor/ExampleInteractor.ts'
  assert.ok(inspectSource(file, "import type { BuffetState } from '../BuffetState'; export class Example { constructor(private state: BuffetState) {} }").length)
  assert.deepEqual(inspectSource(file, "import type { BuffetReader } from '../port/out/BuffetReader'; export class Example { constructor(private reader: BuffetReader) {} }"), [])
})
