# 业务边界与依赖

项目采用模块化单体。Catalog 和 Dining 为两个限界上下文，Session、History、Collection、Completion 为 Dining 内部业务模块。

```mermaid
flowchart LR
    UI[页面与组件] --> C[Catalog public Input]
    UI --> D[Dining public Input]
    D --> S[Session：当前用餐]
    D --> H[History：记录与统计]
    D --> R[Collection：小票收藏]
    D --> F[Completion：完成用餐]
    F --> S
    F --> H
    F --> R
    S --> A[CatalogGatewayAdapter]
    A --> C
```

## 边界判断

Catalog 管理菜品、分类、等级及目录筛选。Dining 使用自己的菜品快照完成选菜和计价，经适配器调用 Catalog 的完整目录查询，不读取 Catalog 内部类型或静态数据源。

当前用餐、已完成记录和收藏共享用餐业务语言。记录与收藏具有不同的删除生命周期，但现有规则主要是快照保存、去重和删除，没有形成额外上下文所需的独立业务模型。因此它们作为内部模块保持数据与实现封装；完成用餐是同一上下文的应用流程。

| 模块 | 数据与规则 | 入口 |
| --- | --- | --- |
| Catalog | 菜品、分类、等级、目录筛选 | GetMenuInput、GetCatalogInput |
| Session | 当前会话、待选、轮次、预览、会话状态校验 | 开始、加载、选菜、提交，以及内部准备结果与关闭 Input |
| History | 记录快照、按 ID 保存/删除、累计统计 | 加载、删除，以及内部保存 Input |
| Collection | 收藏快照、按 ID 收藏/删除 | 加载、删除，以及内部收藏 Input |
| Completion | 准备、保存、可选收藏、关闭的事务协调 | CompleteDiningInput |

## 公开 API 和装配

- 页面只从 `contexts/catalog/public.ts`、`contexts/dining/public.ts` 引用 Input。
- 模块 public.ts 公开自身 Input；Completion 通过这些入口协作，不访问其他模块模型或 Repository。
- Dining 的上下文入口不向页面导出 PrepareDiningCompletion、CloseDining、SaveRecord、CollectReceipt 等内部操作。
- 模块 Configuration 创建具体实现，不依赖 Vue、Pinia 或全局注册表。DiningConfiguration 连接模块，全局 registerApplication 注入 Store、平台、导航并注册公开 Input。
- 领域和应用只依赖自己的模型、端口和纯工具；基础设施实现端口。

新增独立模块或上下文前，应先明确其业务语言、规则、数据所有权和变化原因，不以页面、Store 或物理表的数量判断边界。
