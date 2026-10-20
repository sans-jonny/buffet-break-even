import type {RoomConnectionStatus, RoomCredentials, RoomError, RoomResult, RoomSnapshot} from '../../types'

export interface RoomOutput {
    presentConnection(status: RoomConnectionStatus, detail?: string): void

    presentCredentials(credentials: RoomCredentials): void

    presentState(snapshot: RoomSnapshot): void

    presentResult(result: RoomResult): void

    presentError(error: RoomError): void

    presentEnded(): void

    presentLeft(): void
}
