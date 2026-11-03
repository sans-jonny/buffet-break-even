import {PublicProductImages} from './PublicProductImages';
import {ref} from 'vue';
import type {InjectionToken} from '../../kernel/application/InjectionToken';
import {LocalProductImages} from './LocalProductImages';
import type {RestaurantRecord} from '../../../protocol/RestaurantRecord';

/** UI image associations never enter the restaurant domain or its events. */
export class ProductImageClient {
    static readonly token = Symbol('ProductImageClient') as InjectionToken<ProductImageClient>;
    private readonly roomImages = new Map<string, readonly RestaurantRecord.Image[]>();
    private readonly revision = ref(0);
    private readonly sharing = new Map<string, Promise<void>>();
    private readonly uploadedSources = new Map<string, string>();
    constructor(private readonly baseUrl: string, readonly local = new LocalProductImages()) {}

    initialize(): Promise<void> { return this.local.initialize(); }

    url(value?: string): string {
        return /^\/(sample-images|rooms)\//.test(value || '') ? this.baseUrl.replace(/\/$/, '') + value : value || '';
    }

    cover(restaurant: {id: string; type: string; sourceId?: string}, productId: string, roomId?: string): string {
        void this.revision.value;
        if (restaurant.type === 'PUBLIC') return this.url(PublicProductImages.cover(restaurant.id, productId));
        if (restaurant.type === 'ROOM_COPY' && roomId) {
            const originalId = productId.slice(restaurant.id.length + 1);
            const image = this.roomImages.get(roomId)?.find(item => item.restaurantId === restaurant.sourceId && item.productId === originalId);
            return this.url(image?.url);
        }
        return this.url(this.local.get(restaurant.id, productId));
    }

    async chooseLocal(normalize?: (source: string) => Promise<string>): Promise<string | undefined> {
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
        const data = await this.local.dataUrl(normalize ? await normalize(path) : path);
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
        if (/^\/sample-images\//.test(source)) return;
        // Native durable file paths are app-owned and never accepted from the URL input.
        if (this.localPath(source)) return;
        if (source.length <= 2048 && /^https?:\/\/[^/?#@\s]+(?:[/?#][^\s]*)?$/.test(source)) return;
        throw new Error('请输入有效的 HTTP 或 HTTPS 图片 URL');
    }

    async saveRestaurant(restaurantId: string, products: readonly {id: string; coverUrl?: string}[], normalize?: (source: string) => Promise<string>): Promise<void> {
        await this.initialize();
        for (const product of products) {
            let source = product.coverUrl || '';
            if (source && normalize) {
                const prepared = await normalize(source);
                source = this.isLocal(prepared) ? prepared : await this.local.dataUrl(prepared);
            }
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
                const body = /^(https?:|\/sample-images\/)/.test(source)
                    ? {url: this.url(source)} : {dataUrl: await this.local.dataUrl(source)};
                const image = await this.request<RestaurantRecord.Image>(`/rooms/${encodeURIComponent(roomId)}/product-images/${encodeURIComponent(restaurantId)}/${encodeURIComponent(productId)}`, 'POST', body);
                this.accept(roomId, [...(this.roomImages.get(roomId) || []).filter(item => item.restaurantId !== restaurantId || item.productId !== productId), image]);
                this.uploadedSources.set(imageKey, source);
            }
            await this.request(`/rooms/${encodeURIComponent(roomId)}/product-images/${encodeURIComponent(restaurantId)}`, 'PUT', {productIds: entries.map(entry => entry.productId)});
            this.accept(roomId, (this.roomImages.get(roomId) || []).filter(image => image.restaurantId !== restaurantId || entries.some(entry => entry.productId === image.productId)));
        });
        this.sharing.set(key, work);
        try { await work; } finally { if (this.sharing.get(key) === work) this.sharing.delete(key); }
    }

    async refresh(roomId: string): Promise<void> {
        const catalog = await this.request<RestaurantRecord.Catalog>(`/rooms/${encodeURIComponent(roomId)}/catalog`);
        this.accept(roomId, catalog.images);
    }

    accept(roomId: string, images: readonly RestaurantRecord.Image[]): void {
        if (JSON.stringify(this.roomImages.get(roomId)) !== JSON.stringify(images)) {
            this.roomImages.set(roomId, images);
            this.revision.value++;
        }
    }

    private localPath(source: string): boolean {
        const root = (uni as unknown as {env?: {USER_DATA_PATH?: string}}).env?.USER_DATA_PATH;
        return !!root && source.startsWith(root + '/product-');
    }

    emoji(restaurant: {id: string; type: string}, productId: string): string {
        return restaurant.type === 'PUBLIC' ? PublicProductImages.emoji(restaurant.id, productId) : '🍽️';
    }

    private request<T = unknown>(path: string, method: 'GET' | 'POST' | 'PUT' = 'GET', data?: unknown): Promise<T> {
        return new Promise((resolve, reject) => uni.request({url: this.url(path), method, data: data as any, timeout: 30000,
            success: response => response.statusCode >= 200 && response.statusCode < 300 ? resolve(response.data as T)
                : reject(new Error(`ROOM_IMAGE_${response.statusCode}`)),
            fail: () => reject(new Error('房间图片同步失败，请检查网络后重试'))}));
    }
}
