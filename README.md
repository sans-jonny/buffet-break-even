# 自助餐回本计算器 · DDD 统一事件批次

基于 `codex/vue-ui-only` 的 UniApp / Vue 3 / TypeScript 实现：单人本地用餐、多人事件协作、私人目录、分轮记录、总票价核算、不可变小票与个人历史。

## 运行

需要 Node.js 22 或更新版本。项目只有一个 npm 模块；客户端使用 UniApp Storage，服务端使用 SQLite / Prisma。

```powershell
npm ci
Copy-Item .env.example .env
npm run db:generate
npm run db:migrate
npm run server
```

另开终端执行 `npm run dev:h5`。单人模式无需服务端。多人默认连接 `http://127.0.0.1:3001`；跨设备请设置 `HOST=0.0.0.0`，并将
`VITE_RELAY_URL` 改为可访问的地址。微信真机需配置合法 HTTPS/WSS 域名。

## 验证

```sh
npm test
npm run type-check
npm run build:h5
npm run build:mp-weixin
```

测试包括领域 DSL、事件闭包回滚、Storage 故障注入、真实 SQLite CAS/SQL 回滚、HTTP 协议、架构依赖和真实 SFC 业务流程。首次测试前先执行
`npm run db:generate`；测试数据库在系统临时目录独立创建并清理。

## 代码与约定

- `src/contexts`：Accounting、Catalog、Collaboration 三个上下文，领域行为返回事实，不改变自身。
- `src/coordination/application`：只通过公开端口协调跨上下文用例，没有协调 Domain。
- `src/infrastructure`：完整候选批次、COW/Manifest Storage、提交与回放、同步恢复。
- `server` / `protocol`：不透明房间事件流、SQLite CAS、HTTP/WS 及传输信封。
- `src/ui`：保留原页面与动画，业务按钮调用应用服务；结算须手动选择最终餐厅。

每个手写运行时 TS 文件只有一个同名顶级对象；静态内部模型、类型和工厂只共享该对象的不变量。测试使用
`givenSingle → whenEating → whenSubmitting → thenValueIs` 等领域语言。架构测试持续检查对象与依赖约束。

完整业务基线见 [统一设计](docs/ddd-event-batches.md)，实现边界、DSL 示例和风险状态见 [实现说明](docs/implementation.md)
。真实在线判定、十分钟回收、可信成员权限及真机断电耐久仍保留为设计待决项；当前纯中继不能提供这些保证。

## Domain / Application 结构重构

领域模型已按聚合、实体、值对象、服务和事件分类，写用例使用独立 UseCase/Interactor 与统一事务模板。具体事务端口、泛型事务内接口与事务能力集合已删除；UniApp/Vue 容器将 Interactor 注入到各自的 UseCase，事务型 Interactor 继承统一基类。Repository 使用无事务参数的 `apply`，领域数据使用直接 readonly 字段，事件仅携带身份、预期版本和业务事实。新版本使用 schema 3 和 `buffet:v3:` 本地存储命名空间，不自动迁移或清空旧数据。详见 [重构落地说明](docs/domain-application-refactor.md)。
