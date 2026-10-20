// 运行时配置，全部来自环境变量，便于在服务器上按环境覆盖。
export const config = {
    /** 监听端口，默认 3000。 */
    port: Number(process.env.PORT ?? 3000),
    /** 监听地址，默认绑定所有网卡。 */
    host: process.env.HOST ?? '0.0.0.0',
    /** 空闲房间清理阈值（毫秒），默认 30 分钟。 */
    roomTtlMs: Number(process.env.ROOM_TTL_MS ?? 30 * 60 * 1000),
    /** WebSocket 路由，需与前端 connectSocket 的路径一致。 */
    wsPath: process.env.WS_PATH ?? '/room'
}
