export interface StoragePort {
    getStorageSync(key: string): unknown;

    setStorageSync(key: string, value: unknown): void
}
