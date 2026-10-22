# 自助餐回本 · 多人房间服务（buffet-room-server）

多人模式的实时房间后端：创建房间、按房间码加入、改昵称、记录“谁点了哪道菜”、结束用餐并生成结算结果。

- **框架**：NestJS + `@nestjs/platform-ws`（原生 `ws`，微信小程序 `connectSocket` 兼容，非 socket.io）
- **存储**：纯内存（房间是临时会话，不落库、不建账号；房主在**前端本地**保存结算结果）
- **协议**：WebSocket，消息格式 `{event, data}`，详见 `src/room/protocol.ts`

## 目录

- `src/room/protocol.ts` — 前后端消息契约
- `src/room/room.service.ts` — 房间领域逻辑（纯类，无框架依赖，便于单测）
- `src/room/room.gateway.ts` — WebSocket 网关（socket ↔ 参与者身份绑定，防伪造）
- `src/config.ts` — 运行时配置（环境变量）
- `src/health.controller.ts` — `GET /health` 健康检查

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 监听端口 |
| `HOST` | `0.0.0.0` | 监听地址（服务器上保持 `0.0.0.0` 以对外提供） |
| `ROOM_TTL_MS` | `1800000` | 空闲房间清理阈值（30 分钟） |
| `WS_PATH` | `/room` | WebSocket 路由，须与前端 `connectSocket` 的路径一致 |

## 本地构建与运行

```bash
# 1. 构建共享包（server 依赖它）
cd packages/shared && npm install && npm run build

# 2. 构建并启动 server
cd server && npm install && npm run build
npm start
```

启动后可验证：`curl http://localhost:3000/health` 返回 `{"status":"ok",...}`。

## 部署到服务器

核心结论：**room server 本身跑普通 HTTP/WS 即可，TLS 由反向代理负责**。微信小程序要求 `wss://`，所以前面必须挂一个带合法证书的反向代理。

### 方式 A：systemd + Caddy（推荐，最简单）

Caddy 自动申请并续期 Let's Encrypt 证书，且原生转发 WebSocket，无需手写升级头。

1. 服务器上安装 Node.js 20、Caddy。
2. 把代码放到服务器（`git clone` 或上传），按上面“本地构建”两步编译。
3. 用 systemd 常驻进程，写 `/etc/systemd/system/buffet-room.service`：

   ```ini
   [Unit]
   Description=buffet room server
   After=network.target

   [Service]
   WorkingDirectory=/opt/buffet/server
   Environment=NODE_ENV=production
   Environment=PORT=3000
   ExecStart=/usr/bin/node dist/main.js
   Restart=always
   RestartSec=2
   User=www-data

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl enable --now buffet-room
   ```

4. Caddy 反代：把 `deploy/Caddyfile.example` 内容写入 `/etc/caddy/Caddyfile`，域名换成你自己的，然后 `sudo systemctl reload caddy`。

### 方式 B：Docker

```bash
# 在仓库根目录构建（上下文必须是根目录，才能拿到 packages/shared）
docker build -f server/Dockerfile -t buffet-room-server .

# 运行
docker run -d --name buffet-room \
  -p 3000:3000 \
  -e PORT=3000 \
  --restart unless-stopped \
  buffet-room-server
```

Docker 方式同样建议在前面挂 Caddy/nginx 反代提供 HTTPS/wss。

### 方式 C：PM2

```bash
cd server && npm run build
pm2 start dist/main.js --name buffet-room
pm2 save && pm2 startup
```

## 微信小程序上线必读

微信小程序连这个后端有两条硬性要求：

1. **必须是 `wss://`（HTTPS + TLS 证书）**：所以必须有域名 + 反向代理（见上）。
2. **域名必须 ICP 备案**，且在「微信公众平台 → 开发管理 → 开发设置 → 服务器域名」里，把这个域名同时加入 **socket 合法域名** 和 **request 合法域名**（如果前端还通过 HTTP 拉东西）。

备案通常需要几天到几周，是上线前的关键路径，建议尽早申请。

## 已知限制

- **单实例**：房间状态在内存里，不能多实例水平扩展（多实例会把玩家分到不同进程的房间）。MVP 够用；若要扩缩容，需引入 Redis/PubSub 做跨实例广播，属于后续工作。
- **无账号体系**：参与者身份通过“服务端在 socket 连接上绑定 participantId + token”来防伪造，不校验真实登录态，适合熟人房间场景。

## 测试

```bash
# 单元测试（RoomService）
npm test
# 端到端冒烟（先 npm start 再执行）
node scripts/smoke.cjs
```
