# 构建上下文必须是仓库根目录（因为 server 通过 file:../packages/shared 依赖共享包）：
#   docker build -f server/Dockerfile -t buffet-room-server .
#
# 运行时通过环境变量配置，见 server/README.md。

FROM node:20-alpine AS build
WORKDIR /app

# 先装依赖，充分利用 Docker 层缓存
COPY server/package.json server/package-lock.json ./server/
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
RUN cd server && npm ci

# 拷贝源码并构建共享包 + server
COPY server/src ./server/src
RUN cd packages/shared && npm run build
RUN cd server && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# 共享包（含 dist）与 server 产物、依赖清单
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/server/package.json /app/server/package-lock.json ./server/
COPY --from=build /app/server/dist ./server/dist

WORKDIR /app/server
# 只装生产依赖，同时重建 @buffet/shared 软链
RUN npm ci --omit=dev

EXPOSE 3000
CMD ["node", "dist/main.js"]
