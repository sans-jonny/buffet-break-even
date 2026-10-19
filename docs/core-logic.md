# 核心业务与 Clean Architecture

依据用户提供的《REFACTORING (1).md》进行 Context 模块化重构。保留 UniApp 页面目录和现有界面；使用 Pinia 保存展示状态，通过 UniApp Navigation Adapter 封装原生导航，兼容 H5 与微信小程序。

## 目录与依赖

- `src/contexts/independent/catalog/`：菜单查询 Context，拥有自己的 Product、分类筛选、GetMenu 契约、Interactor 和本地目录 Adapter。
- `src/contexts/independent/buffet/`：用餐 Context，包含会话、数量、轮次、小票、金额和回本规则。Application 通过存储、目录、时钟及展示 Port.Out 工作。
- 每个 Context 的 `public.ts` 只导出 Input。Input 文件直接位于 `application/port/in/`，不再建立用例子目录。Request 和需要的 Response 均为 Input 命名空间内的可构造内部类，通过 `Input.Request`、`Input.Response` 使用；Symbol 注入标识为 `Input.Token`。
- `src/contexts/orchestration/`：跨 Context 流程目录。当前没有跨 Context 一致性流程，暂不建立协调用例；结算继续在 Buffet 内提交完整快照。
- `src/data/`：本地目录源数据及独立数据模型；两个 Context 的 Adapter 各自映射到自身的 Product，不互相导入内部实现。
- `src/stores/`：全局 Pinia 展示状态和独立 ViewModel，只接受 Presenter 发布的只读快照，没有业务动作、持久化或用例调用。
- `src/components/`：全部展示组件及商品外观映射；页面原有的局部组件也迁移至这里。
- `src/navigation/`：导航契约、UniApp 路由、参数编码与返回降级。当前采用自定义标签栏，不使用原生 switchTab。
- `src/composables/`：必需依赖注入与页面错误提示辅助函数。
- `src/pages/`：通过公共 Port.In 发起业务操作，读取全局 Store，调用 Navigation；纯 UI 草稿留在本地。
- `src/contexts/independent/*/composition/`：只组装本 Context 的实现，显式传入 Pinia / 存储实例，向 Vue 注册 Input.Token Symbol，返回公开 Port.In 类型。
- `src/composition/registerApplication.ts`：调用 Context 注册函数并组装 Navigation；`main.ts` 只初始化应用、Pinia 并调用全局组合根。

```text
页面输入 → Port.In Request → Interactor → Domain
                              ↓
                         Gateway 保存
                              ↓
                 Port.Out → Presenter → Pinia → 页面

页面 → Navigation → UniApp 路由
```

Domain / Application 不导入 Vue、Pinia、UniApp、HTTP 客户端或外层实现。页面不构造 Interactor，不直接读写存储，也不拼装路径。

## 用例与映射

| 用例 | 请求 | 直接输出 |
| --- | --- | --- |
| LoadBuffet | 独立空请求 | void，经输出端口发布共享展示状态 |
| BeginSession | 票价、用餐模式、是否替换活动会话 | void |
| ChangeSelection | 商品 ID、+1 / -1 | void |
| CommitRound | 独立空请求 | 专属 committed、roundCount |
| CompleteDining | 是否收藏小票 | 专属 completed、receiptId |
| DeleteRecord | 记录 ID | void |
| DeleteReceipt | 小票 ID | void |
| GetMenu | 分类、等级 | 专属分类、等级、商品查询 Response |

Port.In 返回值显式构造，不返回 Domain、HTTP DTO 或 Store ViewModel。GetMenu 为页面局部查询，筛选响应式来自页面 computed；其 Response 不包含 emoji、渐变等外观字段。共享会话和历史结果只以 Presenter → Store 的途径更新，直接响应仅用于页面协调流程。

## 用例依赖最小化

Interactor 不依赖合并状态对象，只在构造函数注入实际使用的 Port.Out。BuffetReader、BuffetWriter、BuffetOutput、DiningIdGenerator、RoundClock、ReceiptClock 均为单方法接口；CatalogGateway 只提供本 Context 用到的目录能力。

每个应用实例的缓存由 CachedBuffetRepository Adapter 管理，对外分别实现读取和保存端口，持久化成功后再替换缓存。Presenter 显式注入展示所需的目录和日期依赖，Interactor 发布领域快照即可，不必为了展示补充额外目录或时钟依赖。

## 业务规则

1. 开始用餐校验有限正票价、单人/多人模式；已有活动会话时，需要页面明确确认后才替换。
2. 菜品加减校验活动会话和商品 ID，减到零删除该项。未知商品不参与结算。
3. 金额按整数分汇总。本轮价值为单价 × 数量，显示价值为已提交轮次 + 待选价值。
4. 提交非空轮次保存时间、价值和独立明细快照，然后清空待选；重复提交空轮次不会新增记录。
5. 预览包含待选，不提交或修改当前轮次。历史菜品按名称合并数量，保留首次单价；轮次金额独立保存。
6. 结束用餐先提交待选，始终保存点餐记录，可选同时收藏小票，最后清空会话。保存失败不更新业务状态与展示状态，可重试。
7. 同 ID 记录原位更新，新记录排在最前。删除记录和删除收藏相互独立，详情使用稳定 ID；旧 index 参数仍可读取。
8. 累计差额、轮次和菜品数以点餐记录为准，不依赖收藏。
9. 差额 = 已吃价值 − 票价。实际回本百分比四舍五入且可超过 100%；零票价百分比为零。达到票价为回本，达到 60% 为接近回本。进度条的 70% 位置代表回本，仍由 UI 处理。

## 本地存储

新写入使用 `buffet-state-v3`，以 `{ version: 3, session, records, receipts }` 在一个键内提交完整快照，避免三个键独立写入时出现半完成结算。

首次读取没有新快照时兼容 `buffet-session-v2`、`buffet-records`、`buffet-receipts`；旧记录键缺失时以已有收藏初始化记录。第一次成功业务修改时写入新快照，旧键保留。新快照存在后以其为准，因此删除完记录后不会再次从旧小票恢复。此为单向升级；旧版本程序不能读取新快照中的后续变更。

Gateway 对存储数据进行校验与显式映射。空存储返回初始状态，损坏数据或平台读取异常明确报错，不静默覆盖历史记录。写入失败通过页面统一错误提示处理。当前操作均为本地同步用例，页面导航为 Promise 并统一捕获失败；提交按钮有防重复标记。

## 验证

- `npm run check:architecture`：TypeScript AST 检查单顶层声明、内层依赖、Context 隔离、公共出口、UI 与 Store 依赖；同时覆盖别名、相对路径、动态导入和类型导入。
- `npm test`（27 项）：领域边界、独立用例、请求与响应映射、持久化失败重试、多实例与快照隔离、Presenter / Pinia 响应式更新、旧存储兼容、导航、页面事件和依赖方向。
- `npm run type-check`：页面与分层模型类型检查。
- `npm run build:h5 -- --minify esbuild`。
- `npm run build:mp-weixin -- --minify esbuild`。

Pinia 固定为与现有 Vue 3.4 兼容的 2.1.7。当前 npm 对其可选 Vue 2 peer 的解析存在冲突，安装采用 `npm install --legacy-peer-deps`；重装可使用 `npm ci --legacy-peer-deps`。构建使用已有 esbuild，避免引入默认压缩器 terser 的额外依赖。

本次重构前：21 项测试、类型检查、H5 与微信小程序构建通过。本次重构后：27 项测试、类型检查、架构守卫、H5 与微信小程序构建通过。

本地 H5 服务已成功启动，但内置浏览器访问 127.0.0.1:5173 超时，因此没有完成浏览器点击验收。页面脚本集成测试覆盖真实组合根、开始用餐、菜单加减/筛选、提交轮次、结果收藏和按 ID 删除。微信开发者工具运行尚未验证，构建通过不等于运行验收。详见 [重构记录](./refactoring.md)。
