import 'reflect-metadata'
import {NestFactory} from '@nestjs/core'
import {WsAdapter} from '@nestjs/platform-ws'
import {AppModule} from './app.module'
import {RoomService} from './room/room.service'
import {config} from './config'

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule)
    app.useWebSocketAdapter(new WsAdapter(app))
    app.enableShutdownHooks()
    await app.listen(config.port, config.host)
    const rooms = app.get(RoomService)
    setInterval(() => rooms.sweep(Date.now(), config.roomTtlMs), 60_000)
    console.log(`room server listening on ws://${config.host}:${config.port}${config.wsPath}`)
}

void bootstrap()
