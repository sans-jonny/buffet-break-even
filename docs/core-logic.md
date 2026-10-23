# 核心流程、展示与存储

## 完成用餐

CompleteDiningInteractor 在同一本地同步事务中依次：

1. 准备最终结果，包含最后一轮待选；无有效用餐则返回未完成。
2. 将独立 DTO 映射到 History 并暂存记录。
3. 用户选择收藏时映射到 Collection 并暂存收藏。
4. 校验会话 ID，暂存关闭后的空会话。
5. 一次保存完整文档，成功后发布各模块展示快照。

任一步骤或最终保存失败，暂存数据与通知全部丢弃，已提交缓存、存储和 Store 保持原值。重复结束不产生重复记录；失败可以重试。删除记录不影响收藏，删除收藏不影响统计。

LocalDiningDatabase 只负责物理缓存、暂存、单次提交和提交后通知，不包含业务规则。事务仅适用于当前同步本地流程，不提供跨远端服务的事务保证。

## 持久化兼容

继续使用 `buffet-state-v3` 单键、version 3 和 session / records / receipts 字段，不迁移现有 v3 格式。

- storage/UniSnapshotStorage：组织平台读写；存在 v3 文档时优先读取。
- serialization/SnapshotCodec：校验并转换当前格式，读写均生成独立数据。
- migration/LegacySnapshotReader：读取 buffet-session-v2、buffet-records、buffet-receipts；缺失记录时由收藏初始化，不删除旧键。
- schema：物理存储 DTO；不作为领域共享模型。
- 各模块 Repository：只映射所属切片。

损坏数据、未知版本或平台异常明确报错，不静默回退并覆盖现有记录。

## 展示和 Store

三个业务 Store 保持浅层快照引用、只读视图和整份替换，History、Collection 提供按 ID 查询，不访问业务用例或存储。Store 不再用 computed 逐个转发 ViewModel 字段；useApplicationStore 保留 ready 派生状态。ViewModel、默认值和共享小票映射位于 presentation，带 View 后缀的菜品、小票明细和回本类型明确表示展示契约。

Session 的 toDiningView 是纯投影；Presenter 获取所需目录和时间，先生成视图，再通过 AfterCommit 回调安排发布。History、Collection 同样不依赖具体数据库。应用装配连接提交后通知能力。

Vue 页面与组件直接使用 useDiningStore、useHistoryStore、useCollectionStore 和 useApplicationStore，以 diningStore.view.selectedLines 等路径访问状态，不再解构字段或增加只做转发的 computed。recordById、receiptById 等查询方法直接调用 Store，watch 使用 () => applicationStore.ready 等 getter 监听。页面的筛选、展开、弹窗和按钮防重复状态仍留在页面，真正计算新结果的 computed 继续保留。present 是 View 实现方法，仅供 Presenter 或启动装配发布快照；架构检查禁止页面、组件通过 present、$patch、$reset、$state 绕过该流程。

## 初始化和重试

ApplicationBootstrap 在一个只读事务中依次加载三个业务投影；全部计算成功后才统一发布，初始化不会写入存储。useApplicationStore 表示 idle / ready / error，并保存失败信息。

所有页面经 InitializationGate 展示内容。失败时显示错误及“重新读取”；菜单、结果和点单页等有路由判断的页面等待 ready 后再判断会话或记录，防止把尚未加载误判为空。重试调用加载 Input，不由 Store 读取持久化。

## 验证命令

```text
npm test
npm run type-check
npm run check:architecture
npm run build:h5
npm run build:mp-weixin -- --minify esbuild
```

测试按 architecture、catalog、dining、integration 分组；覆盖纯模型、用例、DTO 隔离、存储兼容、事务回滚、真实 Store、页面脚本、初始化失败恢复及边界守卫。微信构建沿用 esbuild，避免当前环境默认 Terser 缺少 @jridgewell/trace-mapping 的依赖问题。
