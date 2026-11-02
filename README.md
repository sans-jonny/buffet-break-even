# 自助餐回本计算器 · DDD 统一事件批次

基于 `codex/vue-ui-only` 的 UniApp / Vue 3 / TypeScript 实现：单人本地用餐、多人事件协作、私人目录、分轮记录、总票价核算、不可变小票与个人历史。

## 运行

需要 Node.js 22 或更新版本。客户端和服务端分别安装依赖：根目录是 UniApp 客户端，`server/package.json` 是独立的 Fastify / SQLite / Prisma 服务端包。

先启动服务端（无需安装根目录依赖）：

```powershell
cd server
Copy-Item .env.example .env
npm ci
npm run db:migrate
npm start
```

安装和启动时都会自动生成 `server/generated/client`，避免缺失 Prisma 客户端。数据库迁移需在首次运行或更新数据库结构后执行；默认数据库为 `server/prisma/dev.db`。服务端读取 `server/.env`，也支持直接设置环境变量。服务端类型检查：在 `server` 中执行 `npm run type-check`。

另开终端，在项目根目录启动客户端：

```powershell
npm ci
Copy-Item .env.example .env
npm run dev:h5
```

根目录的 `npm run server`、`npm run db:generate`、`npm run db:migrate` 和 `npm run db:push` 会转发到服务端包；使用前需安装 `server` 依赖。服务端依赖共享的 `protocol` 目录，部署时需保留该目录与 `server` 的相对位置。

单人模式无需服务端。多人默认连接 `http://127.0.0.1:3001`；跨设备请在 `server/.env` 设置 `HOST=0.0.0.0`，并在根目录 `.env` 中将
`VITE_RELAY_URL` 改为可访问的地址。微信真机需配置合法 HTTPS/WSS 域名。

## 商品图片

领域中的商品只包含 ID、名称、菜品分类和价格。URL、emoji 等展示信息不进入领域快照、目录业务事件或用餐核算。
商品图片由独立的媒体数据按餐厅 ID 和原始商品 ID 关联；个人餐厅可填写外部图片 URL，也可选择本机 JPG/PNG/WebP（最大 3MB）。
本机照片在 H5 使用 IndexedDB，在原生/小程序使用应用数据目录保存，图片索引独立存放；单人模式选择和保存照片无需服务端。

只有创建多人房间或更新共享菜单时才传送个人图片。`POST /rooms/:roomId/product-images/:restaurantId/:productId`
接收 `{dataUrl}` 或外部 `{url}`；图片会校验、去除元数据并缩放至不超过 800×800 的 WebP，外部 URL 只作为引用共享，不由服务端抓取。
`GET /rooms/:roomId/product-images` 返回独立的图片清单，客端按原始餐厅/商品 ID 关联房间副本；菜单保存、同步和重建均不把图片字段塞回领域。
`PUT /rooms/:roomId/product-images/:restaurantId` 接收 `{productIds}`，移除不再使用的临时图片。
私人图片与 `RoomStream` 绑定，存于 SQLite 的 `RoomProductImage`；房间空置十分钟回收时在同一事务删除，外链引用亦同时删除，本机原图保留。
临时图片响应使用 `private, no-store`，公共图片继续存放在 `server/public/sample-images`，以 `/sample-images/:filename` 提供和长期缓存，来源见
[图片来源](server/public/sample-images/SOURCES.md)。公共图片的展示映射独立于默认餐厅领域数据。

旧版本的永久上传入口已取消。旧 `/product-images/:productId/:hash.webp` 仅保留只读迁移：客户端先把旧照片可靠保存到本机，
再调用其 `/release` 接口清理旧文件；迁移失败不会删除旧照片，启动时可重试。旧业务记录中的展示字段只在适配器迁移时读取，重新发布的领域事件不包含这些字段。
升级后执行 `npm run db:migrate` 并重启服务端和客户端。客户端 `VITE_RELAY_URL` 应指向可访问的服务端，微信真机需要配置相应的 HTTPS request/downloadFile 合法域名。

## 验证

```sh
npm test
npm run type-check
npm run build:h5
npm run build:mp-weixin
```

测试包括领域 DSL、事件闭包回滚、Storage 故障注入、真实 SQLite CAS/SQL 回滚、HTTP 协议、架构依赖和真实 SFC 业务流程。首次测试前先执行
`npm --prefix server ci`（会自动生成 Prisma 客户端）；测试数据库在系统临时目录独立创建并清理。完整测试需要同时安装根目录和服务端依赖。

## 代码与约定

- `src/contexts`：Accounting、Catalog、Collaboration 三个上下文，领域行为返回事实，不改变自身。
- `src/coordination/application`：只通过公开端口协调跨上下文用例，没有协调 Domain。
- `src/infrastructure`：完整候选批次、COW/Manifest Storage、提交与回放、同步恢复。
- `server` / `protocol`：不透明房间事件流、SQLite CAS、HTTP/WS 及传输信封。
- `src/ui`：保留原页面与动画，业务按钮调用应用服务；结算使用菜单页当前查看的餐厅，小票图片沿用 master 的绘制与预览保存方式。

每个手写运行时 TS 文件只有一个同名顶级对象；静态内部模型、类型和工厂只共享该对象的不变量。测试使用
`givenSingle → whenEating → whenSubmitting → thenValueIs` 等领域语言。架构测试持续检查对象与依赖约束。

完整业务基线见 [统一设计](docs/ddd-event-batches.md)，实现边界、DSL 示例和风险状态见 [实现说明](docs/implementation.md)
。可信成员权限、领域离线判定及真机断电耐久仍保留为设计待决项。

## 多人房间生命周期

同一用户可以创建和加入多个房间，客户端当前显示并监听一个房间，支持主动退出后重新加入。
服务端按 WebSocket 连接数判断房间是否有人：最后一个连接关闭后开始计时，10 分钟内重新连接取消计时；
到期删除房间、房间码、完整事件流及房间私有菜单，本机已经保存的小票和历史不受影响。
新分配但未进入的房间也从创建起计时。服务端每秒检查，并在请求和订阅进入时执行到期检查；
用 ping/pong 清理失联连接，不能把客户端领域模型中的 `online` 当作实际连接状态。
后台暂停会关闭当前连接，所有人都在后台超过 10 分钟也会回收房间。
空房时间保存在 SQLite，服务端重启保留既有计时；重启前仍有连接的房间从重启时重新给予 10 分钟。
目前连接管理适用于单服务进程，更新后需执行 `npm run db:migrate` 并重启服务端。

## Domain / Application 结构重构

领域模型已按聚合、实体、值对象、服务和事件分类，写用例使用独立 UseCase/Interactor 与统一事务模板。具体事务端口、泛型事务内接口与事务能力集合已删除；UniApp/Vue 容器将 Interactor 注入到各自的 UseCase，事务型 Interactor 继承统一基类。Repository 使用无事务参数的 `apply`，领域数据使用直接 readonly 字段，事件仅携带身份、预期版本和业务事实。新版本使用 schema 3 和 `buffet:v3:` 本地存储命名空间，不自动迁移或清空旧数据。详见 [重构落地说明](docs/domain-application-refactor.md)。
