export type Destination = 'setup' | 'menu' | 'mine' | 'receipts' | 'records' | 'custom-menu' | 'creator'

export interface BuffetNavigation {
    open(destination: Destination, mode?: 'push' | 'replace' | 'reset'): Promise<void>

    toOrderSlip(): Promise<void>

    toResult(receiptId?: string, mode?: 'push' | 'replace' | 'reset'): Promise<void>

    toRecord(recordId: string): Promise<void>

    toCustomMenu(restaurantId?: string): Promise<void>

    toMenuPreview(previewId: string): Promise<void>

    back(fallback: Destination): Promise<void>
}

export const BuffetNavigation = Symbol('BuffetNavigation')
