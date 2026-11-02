import {getCurrentInstance, nextTick, ref} from 'vue';
import {ProductCover} from '../presentation/ProductCover';

export function useProductCover() {
    const visible = ref(false), owner = getCurrentInstance()?.proxy;
    async function render(source: string): Promise<string> {
        if (typeof document !== 'undefined' && typeof Image !== 'undefined') return ProductCover.web(source);
        const info = await new Promise<UniApp.GetImageInfoSuccessData>((resolve, reject) => uni.getImageInfo({src: source, success: resolve, fail: reject}));
        if (info.width === 100 && info.height === 100 && !/^https?:/.test(source)) return source;
        visible.value = true;
        await nextTick();
        const context = uni.createCanvasContext('product-cover', owner), crop = ProductCover.crop(info.width, info.height);
        context.setFillStyle('#ffffff');
        context.fillRect(0, 0, 100, 100);
        context.drawImage(info.path || source, crop.x, crop.y, crop.size, crop.size, 0, 0, 100, 100);
        await new Promise<void>(resolve => context.draw(false, resolve));
        return new Promise<string>((resolve, reject) => uni.canvasToTempFilePath({canvasId: 'product-cover',
            x: 0, y: 0, width: 100, height: 100, destWidth: 100, destHeight: 100, fileType: 'jpg', quality: .9,
            success: result => resolve(result.tempFilePath), fail: reject}, owner));
    }
    return {visible, render};
}
