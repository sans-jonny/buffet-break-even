export type Destination = 'setup' | 'menu' | 'mine' | 'receipts' | 'records' | 'room-lobby' | 'room'

export interface BuffetNavigation {
    open(destination: Destination, mode?: 'push' | 'replace' | 'reset'): Promise<void>

    toOrderSlip(): Promise<void>

    toResult(receiptId?: string): Promise<void>

    toRecord(recordId: string): Promise<void>

    toRoomLobby(): Promise<void>

    toRoom(): Promise<void>

    back(fallback: Destination): Promise<void>
}

export const BuffetNavigation = Symbol('BuffetNavigation')
