/** Center crop equivalent to CSS cover / image aspectFill, with a fixed 100px bitmap. */
export namespace ProductCover {
    export const size = 100;
    export function crop(width: number, height: number) {
        if (!(width > 0 && height > 0)) throw new Error('无法读取图片尺寸');
        const side = Math.min(width, height);
        return {x: (width - side) / 2, y: (height - side) / 2, size: side};
    }

    export async function web(source: string): Promise<string> {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('无法读取封面图片，请检查图片地址和跨域权限'));
            image.src = source;
        });
        if (image.naturalWidth === size && image.naturalHeight === size && source.startsWith('data:image/')) return source;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('无法处理封面图片');
        const crop = ProductCover.crop(image.naturalWidth, image.naturalHeight);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, size, size);
        context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size);
        return canvas.toDataURL('image/jpeg', .9);
    }
}
