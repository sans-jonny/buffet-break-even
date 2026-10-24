# 多人共享用餐

## 安装与启动

要求 Node.js 22 或更新版本。在项目根目录执行：

```powershell
npm ci
npm ci --prefix server
npm run server:dev
```

另一终端执行 `npm run dev:h5`。服务默认监听 `0.0.0.0:3001`，客户端默认连接 `ws://localhost:3001/ws`。可在根目录 `.env.local` 中设置 `VITE_ROOM_SERVER_URL`（参考 `.env.example`），修改后重启前端开发进程。真机的 localhost 指向手机自身，需使用电脑局域网 IP。

服务端环境变量：`PORT`（默认 3001）、`HOST`（默认 0.0.0.0）。生产执行 `npm run server:build`，再执行 `npm run server:start`。服务端单独拥有 package.json 和锁文件，可独立安装、构建、部署；构建阶段需要仓库内的菜品目录及协议文件，运行阶段只需要 `server/dist/index.cjs` 和 Node.js。

### Codex 内嵌浏览器访问本机超时

本项目在 Windows 上验证过：通过受限沙箱启动的 Vite 即使显示 ready，正常 Windows 环境和内嵌浏览器访问 `127.0.0.1:5173` 仍可能超时。此时应在普通 Windows 终端启动服务；由 Codex 启动时，需批准在沙箱外执行开发命令。

```powershell
npm run dev:h5 -- --host 127.0.0.1 --port 5173 --strictPort
```

多人后端也在普通 Windows 终端执行 `npm run server:dev`。保持两个终端运行，在内嵌浏览器打开 `http://127.0.0.1:5173/`。可在同一正常 Windows 环境用 `curl.exe --noproxy "*" --max-time 5 -I http://127.0.0.1:5173/` 检查前端，用 `curl.exe --noproxy "*" --max-time 5 http://localhost:3001/health` 检查后端。仅看到 ready 日志不能确认浏览器可达；停止开发进程后需重新启动才能访问。

这个问题不需要修改 CORS、关闭防火墙或把前端监听地址扩大为 `0.0.0.0`。`--strictPort` 用于在端口被占用时明确报错，避免开发服务悄悄切换端口而浏览器继续访问旧地址。

`GET /health` 返回服务版本 `2.0.0` 和协议版本 `2`。客户端为 `2.0.0`、manifest versionCode 为 `200`。不兼容协议返回 `PROTOCOL_MISMATCH`，提示更新。

## 部署

采用单实例内存存储，不可配置多个独立进程随机分流。服务重启清空全部房间和服务端去重记录；已落入设备本地的最终小票不受影响。请使用进程管理器自动重启，并用健康检查监测 `/health`。

生产前端必须配置 WSS 地址。Nginx 示例（TLS 证书由部署环境配置）：

```nginx
location /ws {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 75s;
}
location /health {
    proxy_pass http://127.0.0.1:3001;
}
```

微信小程序需在小程序管理后台将生产 WSS 域名加入 socket 合法域名，并使用有效 TLS 证书。开发者工具导入 `dist/build/mp-weixin`，本地联调可使用工具提供的开发域名校验设置，发布前必须验证正式合法域名和真机网络。

## 业务规则

首页点击「多人模式」弹出「创建房间／加入房间」选择。创建直接沿用首页填写的门票价格；加入窗口仅输入六位房间号并点击进入。两种方式成功后均进入原有 menu 页面，复用单人菜卡、筛选、购物车、轮次小票和战果 UI，在进度条下方查看房间号与队伍。不再保留独立 room 页面；自定义菜单用餐直接从 setup 的「我的餐厅」种类进入，不再保留独立 my-restaurants 页面。

在「我的」页点击昵称旁的铅笔修改昵称，昵称保存在本机；创建和加入时自动读取，未设置时使用「新手食客」。在线用餐中修改昵称会同步更新队伍，离线修改则在下一次创建／加入时生效。

首次进入应用时生成 UUIDv7，前 48 位编码精确到毫秒的创建时间，持久化到 `buffet-user-id-v1`。昵称、单人用餐、房间恢复凭证分别存储，改名或退出房间不会改变用户 UUID。创建、加入和身份恢复会携带 UUID，服务端在同一房间内复用同 UUID 的成员，避免重新加入或多连接产生重复用餐人；不同 UUID 可以使用相同昵称。UUID 不进入房间广播，后续房间操作仍校验服务端生成的成员凭证。兼容旧客户端未携带 UUID 的请求，旧成员通过有效凭证恢复时可绑定新 UUID。

小票图片文件名采用 `餐厅种类 · 具体餐厅_YYYY-MM-DD HH:mm:ss.png`，时间取自小票原始日期，按设备时区与小票显示一致；旧记录缺失秒时补 `00`，不使用导出当下时间。Windows 文件系统不接受冒号时，将时间分隔符替换为短横线。

- 房主设置整桌总门票，所有成员看到同一份待选、轮次、回本进度和最终小票。允许中途加入，最多 50 名成员。
- 所有人可加减共享菜品；只有房主能给 Waiter 看菜单、提交整份待选、修改票价和结束，客户端与服务端均限制。已提交轮次只读。
- 房主最后一个连接离线满 60 秒后，转让给最早加入的在线成员；暂时无人在线时，等有人恢复后再选举。原房主回来后不收回权限。
- 活动房间全员离线后保留 30 分钟；已结束房间自结束起保留 24 小时，仅原成员能恢复访问。
- 结束会提交剩余待选并冻结结果，包括全部成员当时的昵称（保留同名成员）。每台设备自动按用餐 ID 保存本地点餐历史和昵称，收藏由各成员自行决定，互不影响。历史、收藏沿用独立删除规则；旧记录没有昵称时不猜测补齐。
- 断网时禁用共享操作，不积累离线编辑；仍在房间内时可刷新恢复或自动重连。主动退出房间、返回 setup 或切换到单人时断开连接并清空多人展示，保留房间号、唯一 ID 和恢复凭证。再次打开多人入口时先查询服务端，房间仍可用且编号、唯一 ID 匹配才显示「继续上次用餐」；检查完成即断开检查连接，不持续占用在线成员身份。创建、加入另一个房间才替换旧身份。退出不影响单人进度、其他成员及已保存的个人历史、收藏。

点击菜单进度条上方的门票金额编辑价格，单人修改保持当前待选和轮次不变，多人仅房主可编辑。队伍栏只显示房间号与成员。第一轮提交后，没有待选时仍显示「今日战果」和「已选（0）」，空购物车不允许提交。单人会话与多人会话互相独立，创建、加入、退出房间均不覆盖单人待选和轮次；重开单人用餐才需要确认覆盖已有单人进度。空单人会话只在返回 setup 或退出应用时清理，普通页面切换保留，不生成空历史记录。

## 协议与恢复

客户端连接 `/ws` 后发送 JSON：

```json
{"protocolVersion":2,"requestId":"unique-request-id","command":"changeSelection","params":{"restaurantId":"niuniu","productId":"niuniu-p1-1","change":1}}
```

| 命令 | 参数 |
| --- | --- |
| entry | 无；返回服务端生成的随机 entryKey |
| check | roomId、code；只返回是否为编号与唯一 ID 匹配的未过期房间 |
| create | nickname、ticketPrice、entryKey、typeId；自定义种类另传 catalog |
| join | nickname、code、entryKey |
| resume | roomId、code、memberId、token；恢复时再次核对编号与唯一 ID |
| rename | nickname；仅修改当前成员，1至20字 |
| changeSelection | restaurantId、productId、change（1 或 -1） |
| commitRound | restaurantId、expectedRevision |
| setPrice | ticketPrice、expectedRevision |
| end | restaurantId、expectedRevision；只结算该店并丢弃其他草稿 |
| transferHost | targetMemberId、expectedRevision；当前房主转给另一在线成员 |
| sync | 无 |
| requestStatus | targetRequestId |

`entryKey` 是客户端首次进入前通过 entry 命令取得并持久化的服务端随机标识，用于安全重发尚未确认的 create/join。服务端生成的成员 token 只返回给该成员的进入响应，不能按昵称认领身份。重连通过 resume 恢复认证；凭证保存在本机，勿分享或放入 URL。

消息类型为 response、snapshot 或 error，包含 protocolVersion、operation、对应 requestId、actorId 和适用时的完整 snapshot。snapshot 包括随机房间 id、六位 code、revision、hostId、status、ticketPrice、typeId、按餐厅ID索引的 drafts（每店 selected、rounds）、members、receipt；成员列表不含凭证。create、join、resume 响应另带完整固定 catalog，普通广播不带目录。客户端收到目录后才发布活动用餐展示。

成员当前餐厅只在本机切换，不广播。所有人可以编辑各店待选；提交、改价、结束与主动转让仅房主可操作。房主点击队伍中其他在线成员并确认转让，自己和离线成员不可选。保留原60秒离线自动选举。结束确认框显示房主当前餐厅，并提醒丢弃其他草稿；最终结果存真实餐厅名称、ID、种类与全员昵称。

每次有效变更递增 revision。客户端按房间 id 隔离状态，忽略旧 revision。加减按增量顺序执行；提交、改价、结束、主动转让要求最新 expectedRevision，冲突返回 `REVISION_CONFLICT` 和最新快照，用户重新确认后使用新请求 ID。

客户端发送业务请求前保存 pending 日志，服务端按成员 ID 与 requestId 缓存成功或失败结果。确认丢失时先恢复身份，再查询 requestStatus：已处理则采用原结果，确认未处理才重发原请求。创建／加入通过 entryKey 和原 requestId 幂等重发。sync 与状态查询不进入业务去重缓存。

常见错误码：`INVALID_REQUEST`、`INVALID_NICKNAME`、`INVALID_CODE`、`INVALID_PRICE`、`INVALID_PRODUCT`、`INVALID_RESTAURANT`、`INVALID_CATALOG`、`INVALID_TARGET`、`ROOM_NOT_FOUND`、`ROOM_ENDED`、`UNAUTHORIZED`、`FORBIDDEN`、`REVISION_CONFLICT`、`EMPTY_DINING`、`RATE_LIMIT`、`ROOM_CAPACITY`。错误同时提供中文提示。

服务端每15秒 Ping，连续未响应则断开；客户端每20秒同步，10秒未确认则按最大约30秒指数退避重连。目录上限1 MiB，消息额外预留4 KiB请求信封空间。单连接每10秒最多150条请求，同一IP每分钟最多30次创建／加入，最多5000房间。反向代理后默认按代理地址限流；真实IP限流应在可信代理层配置，不接受任意伪造的转发头。目录限制、参考估值说明见 [餐厅配置](restaurant-catalog.md)，升级规则见 [迁移说明](migration-v4.md)。

服务端 JSON 日志包含请求 ID、操作、房间 ID、revision 和错误码，不打印凭证。最终快照先写本地缓存，再尝试导入历史；本地写入失败显示重试，离开前也会尝试补存历史。

## 验证

```powershell
npm test
npm run type-check
npm run server:type-check
npm run check:architecture
npm run build:h5
npm run build:mp-weixin
```

自动化覆盖领域规则、真实 HTTP/WebSocket 双客户端广播、权限、身份恢复、版本冲突、操作去重、客户端乱序／确认丢失，以及两台设备独立收藏与存储失败恢复。

人工验收：使用两个独立浏览器配置文件或设备（避免共享本地身份），依次创建、加入、共同加减、提交、改价，断开房主等待 60 秒验证转让，结束后分别选择收藏／不收藏；最后用微信开发者工具与 H5 相互加入，检查相同流程以及正式 WSS 域名下的真机表现。
