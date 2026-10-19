# Context 模块化重构记录

依据：用户提供的《REFACTORING (1).md》，版本 v1.0，2026-10-19。

## 基线与业务边界

实施前项目已有 Domain / Application / Framework 分层，21 项测试、类型检查以及 H5 / 微信小程序构建通过。此次在现有未提交修改上迁移，没有回退原有业务和界面修改。

| Context | 所有权 | 公开用例 |
| --- | --- | --- |
| Independent Catalog | 菜品查询、分类、等级及收藏名单筛选 | GetMenu |
| Independent Buffet | 当前用餐、待选、轮次、回本计算、点餐记录、收藏小票、原子持久化 | LoadBuffet、BeginSession、ChangeSelection、CommitRound、CompleteDining、DeleteRecord、DeleteReceipt |
| Orchestration | 未来具有一致性要求的跨 Context 流程 | 当前无此类流程，保留目录及使用说明 |

结束用餐涉及的记录和收藏是 Buffet 内同一份持久化快照的组成部分，因此继续在一个用例内一次保存。菜单查询与用餐操作各自独立，不互相调用 Application。两个 Context 通过各自 Adapter 从本地目录源读取并映射所需字段，彼此不共享 Domain 类型或领域实例。

## 页面与状态读写

全部页面、组件和 Store 均在 Context 外。表中的业务写操作都经由 Input → Interactor → Gateway 保存 → Output → Presenter → Store；页面不直接修改业务状态。

| 页面 | 公开 Port.In | 读取状态 | 本地 UI 状态 |
| --- | --- | --- | --- |
| setup | BeginSession | 当前会话 | 票价草稿、开始中标记、覆盖确认 |
| menu | Catalog.GetMenu；Buffet.LoadBuffet、ChangeSelection | 会话、待选、价值、回本进度 | 分类、等级、购物车开闭 |
| order-slip | CommitRound | 待选、本轮价值 | 提交中标记 |
| result | CompleteDining、DeleteReceipt | 预览、记录、收藏 | 提交中、详情 ID、删除确认 |
| mine | 无 | 当前会话、累计统计 | 展示与导航 |
| receipts | 无 | 收藏列表 | 展示与导航 |
| records | 无 | 记录列表、累计统计 | 展示与导航 |
| record-detail | DeleteRecord | 按 ID 定位的记录 | 详情 ID、删除确认 |

App 启动时通过 LoadBuffet 发布持久化快照。当前所有存储都是本地同步调用，没有业务 HTTP 请求入口。页面导航仍由 Navigation 完成；当前标签栏是自定义组件，所有页面位于主包，没有原生 TabBar 或物理分包。

## 完成的结构调整

- 每个 Context 拥有自己的 Domain、Application、Port.Out、Adapter、Composition 和 public.ts；公共入口只导出 Input，其内部公开专属 Request / Response。
- 所有用例的 Request 和需要的 Response 收为 Input 命名空间中的内部类，可使用 `new Input.Request(...)`、`new Input.Response(...)`；execute 参数和直接输出分别使用这两个类型。Symbol 为 `Input.Token`，不再保留独立 Request / Response 文件。
- 仅 Input 文件直接放在 `application/port/in/` 下，移除每个用例外层的子文件夹。
- Port.In 显式映射专属 DTO；Port.Out 使用当前 Context 的 Domain 模型。存储 Adapter 负责领域对象和独立持久化结构的转换，Presenter 负责独立 ViewModel 投影。
- 全局 Store 位于 `src/stores`，仅保留展示快照赋值。Presenter 显式接收所需 Store；Context 注册函数使用明确的 Pinia 实例。
- 所有页面级展示组件迁至 `src/components`。商品外观映射属于展示组件辅助函数，页面不再引用 Context Adapter。
- 全局组合根负责注册 Context 和 Navigation；main.ts 保留 uni-app 的 createSSRApp 入口，返回 app、pinia 和 Pinia。
- 保留 `buffet-state-v3`、旧键读取兼容、失败不发布成功状态以及单键完整快照提交机制。
- 新增 TypeScript AST 架构守卫及反例测试，防止别名或相对路径绕过依赖边界；该检查也包含在 npm test 中。

## 用例依赖细化

按后续要求移除合并的 BuffetState，Interactor 构造参数只使用实际用到的 Port.Out：

| 用例 | 输出端口依赖 |
| --- | --- |
| LoadBuffet | BuffetReader、BuffetOutput |
| BeginSession | BuffetReader、BuffetWriter、BuffetOutput、DiningIdGenerator |
| ChangeSelection | BuffetReader、BuffetWriter、BuffetOutput、CatalogGateway |
| CommitRound | BuffetReader、BuffetWriter、BuffetOutput、CatalogGateway、RoundClock |
| CompleteDining | BuffetReader、BuffetWriter、BuffetOutput、CatalogGateway、RoundClock、ReceiptClock |
| DeleteRecord / DeleteReceipt | BuffetReader、BuffetWriter、BuffetOutput |
| Catalog.GetMenu | Catalog 自身的 CatalogGateway |

CachedBuffetRepository Adapter 实现独立的读写端口，保留每个应用实例的缓存和快照隔离，持久化成功后再替换缓存。BuffetOutput 只接收领域快照，Presenter 注入自身投影所需的目录和日期依赖。架构守卫禁止独立 Context 的 Interactor 构造参数退回具体状态对象。

请求使用方式：`new BeginSessionInput.Request(200, '单人')`；注入使用 `useRequired<BeginSessionInput>(BeginSessionInput.Token)`。原有对象字面量请求保持结构类型兼容。该变更按用户后续要求覆盖原文档中 Request / Response 分文件、同名 Symbol 的约定。

## 验证结果与剩余人工验收

| 检查 | 结果 |
| --- | --- |
| npm test | 27 项通过，包含领域、全部用例、Presenter、持久化失败与恢复、导航、真实组合根和页面脚本集成 |
| npm run check:architecture | 通过 |
| npm run type-check | 通过 |
| npm run build:h5 -- --minify esbuild | 通过 |
| npm run build:mp-weixin -- --minify esbuild | 通过 |
| H5 浏览器点击 | 未完成：开发服务启动成功，但内置浏览器访问 127.0.0.1:5173 超时 |
| 微信开发者工具运行 | 未执行，需要导入 dist/build/mp-weixin 验收 |

人工验收路径：开始用餐 → 分类/等级筛选及菜品加减 → 提交轮次 → 结果预览 → 结束并收藏 → 点餐记录/小票详情 → 分别删除记录与收藏 → 重启后恢复。还应检查自定义标签栏、详情返回、页面刷新及存储失败提示。
