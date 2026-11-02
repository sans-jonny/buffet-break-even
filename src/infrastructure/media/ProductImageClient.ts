import {ref} from 'vue';
import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {LocalProductImages} from './LocalProductImages';

/** UI image associations never enter the restaurant domain or its events. */
export class ProductImageClient {
    static readonly token = Symbol('ProductImageClient') as InjectionToken<ProductImageClient>;
    private readonly roomImages = new Map<string, {restaurantId: string; productId: string; url: string}[]>();
    private readonly revision = ref(0);
    private readonly sharing = new Map<string, Promise<void>>();
    private readonly uploadedSources = new Map<string, string>();
    constructor(private readonly baseUrl: string, readonly local = new LocalProductImages()) {}

    initialize(): Promise<void> { return this.local.initialize(); }

    url(value?: string): string {
        return /^\/(sample-images|rooms|product-images)\//.test(value || '') ? this.baseUrl.replace(/\/$/, '') + value : value || '';
    }

    cover(restaurant: {id: string; type: string; sourceId?: string}, productId: string, roomId?: string): string {
        void this.revision.value;
        if (restaurant.type === 'PUBLIC') return this.url(this.publicCover(restaurant.id, productId));
        if (restaurant.type === 'ROOM_COPY' && roomId) {
            const originalId = productId.slice(restaurant.id.length + 1);
            const image = this.roomImages.get(roomId)?.find(item => item.restaurantId === restaurant.sourceId && item.productId === originalId);
            return this.url(image?.url);
        }
        return this.url(this.local.get(restaurant.id, productId));
    }

    async chooseLocal(): Promise<string | undefined> {
        const path = await new Promise<string | undefined>((resolve, reject) => uni.chooseImage({
            count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
            success: result => {
                const file = (result.tempFiles as UniApp.ChooseImageSuccessCallbackResultFile[])[0];
                if (file?.size > 3 * 1024 * 1024) return reject(new Error('图片不能超过 3MB'));
                resolve(result.tempFilePaths[0]);
            },
            fail: error => /cancel/i.test(error.errMsg) ? resolve(undefined) : reject(new Error('选择图片失败，请重试'))
        }));
        if (!path) return;
        const data = await this.local.dataUrl(path);
        this.validate(data);
        return data;
    }

    isLocal(source: string): boolean { return source.startsWith('data:image/') || this.localPath(source); }

    validate(source: string): void {
        if (!source) return;
        if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(source)) {
            if (source.length > 4 * 1024 * 1024 + 100) throw new Error('图片不能超过 3MB');
            return;
        }
        if (/^\/(sample-images|product-images)\//.test(source)) return;
        // Native durable file paths are app-owned and never accepted from the URL input.
        if (this.localPath(source)) return;
        if (source.length <= 2048 && /^https?:\/\/[^/?#@\s]+(?:[/?#][^\s]*)?$/.test(source)) return;
        throw new Error('请输入有效的 HTTP 或 HTTPS 图片 URL');
    }

    async saveRestaurant(restaurantId: string, products: readonly {id: string; coverUrl?: string}[]): Promise<void> {
        await this.initialize();
        for (const product of products) {
            const source = product.coverUrl || '';
            this.validate(source);
            if (source !== this.local.get(restaurantId, product.id)) await this.local.set(restaurantId, product.id, source);
        }
        const ids = new Set(products.map(product => product.id));
        for (const previous of this.local.entries(restaurantId))
            if (!ids.has(previous.productId)) await this.local.set(restaurantId, previous.productId, '');
    }

    async share(roomId: string, restaurantId: string, productIds: readonly string[]): Promise<void> {
        const key = JSON.stringify([roomId, restaurantId]);
        // Serialize retries/updates so an older upload cannot overwrite a newer room image.
        const work = (this.sharing.get(key) || Promise.resolve()).catch(() => {}).then(async () => {
            await this.initialize();
            const entries = this.local.entries(restaurantId).filter(entry => productIds.includes(entry.productId));
            for (const {productId, source} of entries) {
                const imageKey = JSON.stringify([roomId, restaurantId, productId]);
                if (this.uploadedSources.get(imageKey) === source &&
                    this.roomImages.get(roomId)?.some(image => image.restaurantId === restaurantId && image.productId === productId)) continue;
                const body = /^(https?:|\/(?:sample-images|product-images)\/)/.test(source)
                    ? {url: this.url(source)} : {dataUrl: await this.local.dataUrl(source)};
                await this.request(`/rooms/${encodeURIComponent(roomId)}/product-images/${encodeURIComponent(restaurantId)}/${encodeURIComponent(productId)}`, 'POST', body);
                this.uploadedSources.set(imageKey, source);
            }
            await this.request(`/rooms/${encodeURIComponent(roomId)}/product-images/${encodeURIComponent(restaurantId)}`, 'PUT', {productIds: entries.map(entry => entry.productId)});
            await this.refresh(roomId);
        });
        this.sharing.set(key, work);
        try { await work; } finally { if (this.sharing.get(key) === work) this.sharing.delete(key); }
    }

    async refresh(roomId: string): Promise<void> {
        const images = await this.request<{restaurantId: string; productId: string; url: string}[]>(`/rooms/${encodeURIComponent(roomId)}/product-images`);
        if (JSON.stringify(this.roomImages.get(roomId)) !== JSON.stringify(images)) {
            this.roomImages.set(roomId, images);
            this.revision.value++;
        }
    }

    async importLegacy(records: readonly {id: string; type: string; products: readonly {id: string; coverUrl?: string}[]}[]): Promise<void> {
        await this.initialize();
        const migrationKey = 'buffet:product-images:legacy-imports';
        const migrated: Record<string, boolean> = uni.getStorageSync(migrationKey) || {};
        const legacy = new Map<string, {restaurantId: string; productId: string; original: string; marker: string}[]>();
        for (const record of records) {
            if (record.type !== 'PRIVATE') continue;
            for (const product of record.products) {
                if (!product.coverUrl) continue;
                const source = product.coverUrl.startsWith(this.baseUrl) ? product.coverUrl.slice(this.baseUrl.length) : product.coverUrl;
                if (/^\/product-images\/[^/]+\/[a-f0-9]{64}\.webp$/.test(source)) {
                    const entries = legacy.get(source) || [];
                    entries.push({restaurantId: record.id, productId: product.id, original: product.coverUrl,
                        marker: JSON.stringify([record.id, product.id, source])});
                    legacy.set(source, entries);
                } else if (!this.local.get(record.id, product.id)) await this.local.set(record.id, product.id, product.coverUrl);
            }
        }
        for (const [source, entries] of legacy) {
            const pending = entries.filter(entry => !migrated[entry.marker]);
            if (pending.length) {
                try {
                    const dataUrl = await new Promise<string>((resolve, reject) => uni.request({url: this.url(source), responseType: 'arraybuffer',
                        success: result => result.statusCode === 200 ? resolve('data:image/webp;base64,' + uni.arrayBufferToBase64(result.data as ArrayBuffer))
                            : reject(new Error('LEGACY_IMAGE_NOT_FOUND')), fail: reject}));
                    // Every association is saved locally before the shared legacy file can be deleted.
                    for (const entry of pending) {
                        if (!this.local.get(entry.restaurantId, entry.productId) || this.local.get(entry.restaurantId, entry.productId) === entry.original)
                            await this.local.set(entry.restaurantId, entry.productId, dataUrl);
                        migrated[entry.marker] = true;
                        uni.setStorageSync(migrationKey, migrated);
                    }
                } catch {
                    for (const entry of pending) if (!this.local.get(entry.restaurantId, entry.productId))
                        await this.local.set(entry.restaurantId, entry.productId, entry.original);
                    continue;
                }
            }
            // An older server may not support release yet; retry safely at the next startup.
            await this.request(source + '/release', 'POST', {}).catch(() => {});
        }
    }

    private localPath(source: string): boolean {
        const root = (uni as unknown as {env?: {USER_DATA_PATH?: string}}).env?.USER_DATA_PATH;
        return !!root && source.startsWith(root + '/product-');
    }

    private publicCover(restaurantId: string, productId: string): string {
        if (!['niuniu', 'daniu', 'yixu', 'charcoal', 'flame', 'spicy-pot', 'garden-pot', 'oven', 'cheese'].includes(restaurantId)) return '';
        if (['margherita', 'pepperoni', 'hawaiian', 'durian', 'seafood-pizza', 'four-cheese'].includes(productId)) return '/sample-images/pizza.jpg';
        if (['caesar', 'garden-salad', 'vegetables'].includes(productId)) return '/sample-images/salad.jpg';
        if (['beef', 'wagyu', 'short-rib', 'skirt-steak', 'beef-slices'].includes(productId)) return '/sample-images/steak.jpg';
        if (['lettuce', 'potato', 'lotus-root', 'king-mushroom', 'mushrooms'].includes(productId)) return '/sample-images/picsum-food.jpg';
        if (productId === 'strawberries') return '/sample-images/picsum-strawberries.jpg';
        return '';
    }

    private request<T = unknown>(path: string, method: 'GET' | 'POST' | 'PUT' = 'GET', data?: unknown): Promise<T> {
        return new Promise((resolve, reject) => uni.request({url: this.url(path), method, data: data as any, timeout: 30000,
            success: response => response.statusCode >= 200 && response.statusCode < 300 ? resolve(response.data as T)
                : reject(new Error(`ROOM_IMAGE_${response.statusCode}`)),
            fail: () => reject(new Error('房间图片同步失败，请检查网络后重试'))}));
    }
}
