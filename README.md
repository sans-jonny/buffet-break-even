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

安装依赖时会自动生成 `server/generated/client`。日常启动直接使用已生成的客户端；修改 Prisma schema 后，先停止服务端，再执行 `npm run db:generate`，避免 Windows 下正在使用的引擎 DLL 被锁定。数据库迁移需在首次运行或更新数据库结构后执行；默认数据库为 `server/prisma/dev.db`。服务端读取 `server/.env`，也支持直接设置环境变量。服务端类型检查：在 `server` 中执行 `npm run type-check`。

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
封面在保存前按 cover/aspectFill 居中裁剪成 100×100 像素，填满画面；透明区域使用白底，避免黑边。H5 使用 IndexedDB，原生/小程序使用应用数据目录保存，图片索引独立存放；单人模式选择和保存照片无需服务端。创造者模式的新菜单默认有一个“默认”菜品分类。

私人菜单和照片的编辑、删除仅保存本机；只有创建多人房间或本人重新加入原房间时才更新已共享菜单及图片。`POST /rooms/:roomId/product-images/:restaurantId/:productId`
接收 `{dataUrl}` 或外部 `{url}`；图片会校验、去除元数据并缩放至不超过 800×800 的 WebP，外部 URL 只作为引用共享，不由服务端抓取。
`GET /rooms/:roomId/catalog` 一起返回私人菜单和图片清单，客端按原始餐厅/商品 ID 关联房间副本。首次连接及共享图片更新完成后，WebSocket 也会携带这份菜单信封；空闲轮询和加菜不再单独请求图片清单。菜单保存、同步和重建均不把图片字段塞回领域。
`PUT /rooms/:roomId/product-images/:restaurantId` 接收 `{productIds}`，移除不再使用的临时图片。
私人图片与 `RoomStream` 绑定，存于 SQLite 的 `RoomProductImage`；房间空置十分钟回收时在同一事务删除，外链引用亦同时删除，本机原图保留。
临时图片响应使用 `private, no-store`，公共图片继续存放在 `server/public/sample-images`，以 `/sample-images/:filename` 提供和长期缓存，来源见
[图片来源](server/public/sample-images/SOURCES.md)。公共图片的展示映射独立于默认餐厅领域数据。

新项目执行 `npm run db:migrate`；已有开发库执行 `npm run db:reset` 后重新启动服务端和客户端。客户端 `VITE_RELAY_URL` 应指向可访问的服务端，微信真机需要配置相应的 HTTPS request/downloadFile 合法域名。

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

多人事务先在隔离工作区生成完整领域事件批次，仅发送候选事件与当前事件流版本。服务端在事务中比较版本：不匹配则整批拒绝，匹配则追加事件并广播给包括发送者在内的所有订阅者。HTTP 成功响应不写客户端业务投影、日志或游标，也不发布数据失效通知；客户端只在收到广播后原子保存完整批次、投影和新版本，再发布失效通知。重复广播不重复保存。写命令等待收到的批次持久化后才成功，发送和等待不会占用回放队列。广播缺失时可通过服务端历史事件补齐，仍不采用 HTTP 提交响应中的事件做投影或重发原请求。

同一用户可以创建和加入多个房间，客户端当前显示并监听一个房间，支持主动退出后重新加入。
离开多人菜单或从结果返回首页时会退出当前房间、清除本机会话并断开 WebSocket，即便已经点餐也如此；历史和上次房间入口保留，前台恢复不会重连已退出房间。
提交结果不确定时不会自动重复发送原请求：菜单提供“核对房间记录并恢复”，核对后应确认当前数量再继续。此状态仍允许退出并断开连接；本机保留歧义标记，重新加入时先核对历史，再恢复房间，不重复加菜。
公开菜单始终读取各设备的本地目录，不上传房间副本，也不向房间同步本地公开菜单的新增、调价和删除。
应用启动时会将已有公共餐厅的本地内容更新为当前内置菜单，内容相同则不重复发布；私人餐厅及显式删除记录保留。这样重新加入房间时不会因本地菜单缺少当前内置菜品而中断核算。
私人菜单在创建房间时确定共享来源；原创建者重新加入时（包括已在线时恢复），仅更新房间中已存在的同源私人副本与临时图片。
其他成员的同 ID 私人菜单和后来新增但未共享的私人餐厅不会被上传覆盖。没有有效本地 Activity 的菜单页返回 setup，已结束的有效 Activity 进入 result；预览模式无需 Activity。
服务端按 WebSocket 连接数判断房间是否有人：最后一个连接关闭后开始计时，10 分钟内重新连接取消计时；
到期删除房间、房间码、完整事件流及房间私有菜单，本机已经保存的小票和历史不受影响。
新分配但未进入的房间也从创建起计时。服务端每秒检查，并在请求和订阅进入时执行到期检查；
用 ping/pong 清理失联连接，不能把客户端领域模型中的 `online` 当作实际连接状态。
订阅统一使用应用层心跳：服务端每 10 秒发送 `heartbeat`，客户端返回相同序号的 `heartbeatAck`。双方以 30 秒为心跳超时；超时关闭失效连接。客户端按 1、2、4 秒逐步延长重连间隔（最长 30 秒），重连后先补齐事件历史；主动退出、切换房间和进入后台会取消心跳与重连。心跳不追加领域事件、不推进事件流版本，也不触发业务查询失效。订阅必须返回心跳配置和菜单信封，协议缺失会明确拒绝；底层 WebSocket ping/pong 同时保留。
后台暂停会关闭当前连接，所有人都在后台超过 10 分钟也会回收房间。
单人和多人结束用餐后都停留在 result 页，可继续查看和保存小票；只有主动返回首页时才进入 setup，多人此时才离开房间并断开连接。
空房时间保存在 SQLite，服务端重启保留既有计时；重启前仍有连接的房间从重启时重新给予 10 分钟。
目前连接管理适用于单服务进程，更新后需执行 `npm run db:migrate` 并重启服务端。

## Domain / Application 结构重构

领域模型已按聚合、实体、值对象、服务和事件分类，写用例使用独立 UseCase/Interactor 与统一事务模板。具体事务端口、泛型事务内接口与事务能力集合已删除；UniApp/Vue 容器将 Interactor 注入到各自的 UseCase，事务型 Interactor 继承统一基类。Repository 使用无事务参数的 `apply`，领域数据使用直接 readonly 字段，事件仅携带身份、预期版本和业务事实。新版本使用 schema 3 和 `buffet:v3:` 本地存储命名空间，仅接受当前字段与协议，不提供旧格式补值或接口回退。详见 [重构落地说明](docs/domain-application-refactor.md)。

## 开发数据重置

服务端数据库使用单一当前基线 `20261102000300_baseline`，旧迁移链及旧格式升级逻辑已删除。清空服务端测试数据时，先停止服务端，在根目录运行 `npm run db:reset` 后重新启动；此命令删除服务端房间、事件、菜单及临时图片，不清理本地个人数据或 Git 历史。优化检查和后续建议见 [项目清理与优化检查](docs/optimization-review.md)。
