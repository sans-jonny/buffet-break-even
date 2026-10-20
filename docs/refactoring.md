# DDD 重构记录

## 最终结构

以 [ddd-by-examples/library](https://github.com/ddd-by-examples/library) 的业务边界、局部架构和框架隔离思路为参考，保留本项目明确约定的应用端口与 Input 内部类。

```text
src/
  contexts/
    catalog/
      model/
      application/{port/in,port/out,interactor}/
      infrastructure/data/
      CatalogConfiguration.ts
      public.ts
    dining/
      session/
        model/snapshot/
        application/{port/in,port/out,interactor}/
        infrastructure/{persistence,presentation,integration,system}/
        SessionConfiguration.ts
        public.ts
      history/       # model、application、infrastructure、HistoryConfiguration.ts、public.ts
      collection/    # model、application、infrastructure、CollectionConfiguration.ts、public.ts
      completion/    # application、infrastructure/transaction、CompletionConfiguration.ts、public.ts
      DiningConfiguration.ts
      public.ts
  infrastructure/
    persistence/     # storage、serialization、migration、schema
    transaction/     # 提交后发布契约
  presentation/      # 不依赖 Vue 的展示契约、默认值、映射及外观
  data/              # 静态目录数据
  utils/             # 纯函数工具
  ui/                # Vue / Pinia / uni-app 源码入口
    composition/     # 全局框架注册与启动加载
    stores/          # 三个业务快照 Store 和初始化状态
    composables/     # 页面只读入口与视图逻辑
    navigation/      # uni-app 路由适配
    pages/
    components/
    static/
    App.vue
    main.ts
    pages.json
    manifest.json
    uni.scss
    env.d.ts
    shime-uni.d.ts
```

Vue 页面、组件、Pinia 状态和平台入口集中在 `ui`；业务上下文与共享代码不得反向依赖 `ui`、Vue 或 Pinia。`presentation` 中的 ViewModel、ViewStore 和 ProductAppearanceProvider 是纯 TypeScript 契约，由业务 Presenter 与 UI Store 共享；具体 Presenter 仍归各业务模块的基础设施层所有。

各业务上下文与内部模块的 `*Configuration.ts` 均位于自身根目录，与 `application`、`infrastructure` 和 `public.ts` 同级，负责组装用例与适配器。它们是模块的组装根，不属于领域模型或基础设施实现；`ui/composition` 负责应用级装配和框架注册。

所有 `dev:*` / `build:*` 命令通过 `scripts/uni.cjs` 把 `UNI_INPUT_DIR` 设置为 `src/ui`。因此 `pages.json` 中的 `pages/...` 路由、组件自动扫描及 `/static/...` 资源路径继续沿用原值。Vite 与 TypeScript 的 `@/` 都指向 `src/`，例如 `@/ui/composables/useDiningView` 和 `@/contexts/dining/public`。日常开发继续使用原来的 npm 命令；直接运行 `uni` 或使用 HBuilderX 时，需要使用同样的输入目录设置。

## 迁移内容

| 原职责 | 最终位置与变化 |
| --- | --- |
| independent/catalog | Catalog 上下文；增加完整目录公开查询供 Dining 适配 |
| independent/dining | Dining.session；保留不可变聚合及全部规则 |
| independent/dining-history | Dining.history；保留记录与统计所有权 |
| independent/receipt-collection | Dining.collection；保留收藏生命周期 |
| orchestration/complete-dining | Dining.completion；协调内部公开 Input，无独立领域模型 |
| domain/entity、value-object、collection | model 下直接按业务名称排列 |
| stores 下展示类型和映射 | presentation 下按用途组织，展示明细类型增加 View 后缀 |
| Presenter 依赖 LocalDiningDatabase | 改为 AfterCommit 回调；纯投影先于提交完成 |
| SystemDiningClock 同时生成 ID | 时钟与 ID 生成器拆开 |
| 各模块直接 Vue provide | Configuration 返回实例，由全局组合根统一注册 |
| UniSnapshotStorage 包含全部校验和旧键读取 | 分离 serialization、migration、schema 和 storage |
| 初始化失败只弹 Toast | 显式初始化状态、页面错误与重试、延迟路由判断 |

迁移前核对旧入口及上一轮未接入副本，内容一致的版本合并到唯一实现；旧源码入口与临时迁移脚本已移除。没有引入额外 Policy、状态类、事件总线、消息队列或最终一致性。

## 边界守卫

检查领域与应用不依赖框架和基础设施；完成流程只访问内部公开契约；跨上下文只访问公开入口；页面不读取内部模块和 Store；只读 composable 不调用写入方法；Presenter 不依赖具体数据库。Input 必须位于 port/in，输出端口位于 port/out，Request / Response 保留在 Input 命名空间内。

边界依据业务职责，不强制每个模块都建立相同层级。History、Collection 目前保留现有简单集合行为；目录的数据来源和展示投影各自封装。

## 行为兼容与验收

金额算法、业务操作、存储键和版本保持兼容。事务失败重试、旧数据恢复、记录与收藏独立删除均由回归测试覆盖。验证命令见 [核心流程](./core-logic.md)。边界与模型决策见 [上下文图](./context-map.md)、[领域模型](./domain-model.md)。

当前共 47 项自动测试通过，同时通过 TypeScript、架构检查、H5 和微信小程序构建（小程序使用 `--minify esbuild`）。本次目录迁移还核对了构建产物中的全部八个页面路由及静态资源。此前 H5 浏览器实际验收覆盖开始、加减、提交轮次、合并待选结果、完成收藏、记录详情和刷新恢复；本次未重复浏览器点击验收。删除隔离及初始化错误恢复由页面脚本和集成测试验证；未运行微信开发者工具的真机或模拟器点击验收。
