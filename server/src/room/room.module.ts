import {Module} from '@nestjs/common'
import {RoomGateway} from './room.gateway'
import {RoomService} from './room.service'
import {products} from '../catalog'

@Module({
    providers: [
        RoomGateway,
        {provide: RoomService, useFactory: () => new RoomService(products)}
    ]
})
export class RoomModule {
}
