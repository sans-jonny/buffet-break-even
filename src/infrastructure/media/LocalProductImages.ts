import {ref} from 'vue';

/** Presentation-only local media. Browser blobs use IndexedDB; native files use the app data directory. */
export class LocalProductImages {
    readonly revision = ref(0);
    private readonly values = new Map<string, string>();
    private database?: IDBDatabase;
    private initialized?: Promise<void>;
    private readonly indexKey = 'buffet:product-images:v2';

    initialize(): Promise<void> {
        return this.initialized ||= this.load();
    }

    private async load(): Promise<void> {
        if (typeof indexedDB !== 'undefined') {
            this.database = await new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open('buffet-product-images', 1);
                request.onupgradeneeded = () => request.result.createObjectStore('images', {keyPath: 'key'});
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(new Error('无法打开本机图片存储'));
            });
            const records = await new Promise<{key: string; source: string}[]>((resolve, reject) => {
                const request = this.database!.transaction('images').objectStore('images').getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            records.forEach(record => this.values.set(record.key, record.source));
        } else {
            const stored = uni.getStorageSync(this.indexKey);
            if (stored && typeof stored === 'object') Object.entries(stored).forEach(([key, value]) => {
                if (typeof value === 'string') this.values.set(key, value);
            });
        }
        this.revision.value++;
    }

    get(restaurantId: string, productId: string): string {
        void this.revision.value;
        return this.values.get(JSON.stringify([restaurantId, productId])) || '';
    }

    entries(restaurantId: string): {productId: string; source: string}[] {
        return [...this.values].flatMap(([key, source]) => {
            const [restaurant, productId] = JSON.parse(key);
            return restaurant === restaurantId ? [{productId, source}] : [];
        });
    }

    async set(restaurantId: string, productId: string, source: string): Promise<void> {
        await this.initialize();
        const key = JSON.stringify([restaurantId, productId]);
        const previous = this.values.get(key);
        const fs = this.nativeFiles();
        if (source.startsWith('data:image/') && fs) {
            const match = source.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
            if (!match) throw new Error('图片格式不正确');
            const filename = `${fs.root}/product-${Date.now()}-${Math.random().toString(36).slice(2)}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
            await new Promise<void>((resolve, reject) => fs.manager.writeFile({filePath: filename, data: match[2], encoding: 'base64', success: () => resolve(), fail: reject}));
            source = filename;
        }
        if (this.database) {
            await new Promise<void>((resolve, reject) => {
                const transaction = this.database!.transaction('images', 'readwrite');
                const store = transaction.objectStore('images');
                if (source) store.put({key, source}); else store.delete(key);
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });
        } else {
            const next = new Map(this.values);
            if (source) next.set(key, source); else next.delete(key);
            uni.setStorageSync(this.indexKey, Object.fromEntries(next));
        }
        if (source) this.values.set(key, source); else this.values.delete(key);
        this.revision.value++;
        // Only remove app-owned files, after their new metadata has been durably saved.
        if (fs && previous !== source && previous?.startsWith(fs.root + '/product-'))
            fs.manager.unlink({filePath: previous, fail: () => {}});
    }

    async dataUrl(source: string): Promise<string> {
        if (source.startsWith('data:image/')) return source;
        const fs = this.nativeFiles();
        if (fs) {
            const data = await new Promise<string>((resolve, reject) => fs.manager.readFile({filePath: source, encoding: 'base64',
                success: result => resolve(String(result.data)), fail: reject}));
            const extension = source.split('.').pop()?.toLowerCase();
            return `data:image/${extension === 'png' ? 'png' : extension === 'webp' ? 'webp' : 'jpeg'};base64,${data}`;
        }
        const response = await fetch(source);
        if (!response.ok) throw new Error('无法读取本机图片');
        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('无法读取本机图片'));
            reader.readAsDataURL(blob);
        });
    }

    private nativeFiles() {
        const root = (uni as unknown as {env?: {USER_DATA_PATH?: string}}).env?.USER_DATA_PATH;
        return root && typeof uni.getFileSystemManager === 'function' ? {root, manager: uni.getFileSystemManager()} : undefined;
    }
}
