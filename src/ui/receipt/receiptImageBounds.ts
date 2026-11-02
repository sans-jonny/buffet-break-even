/** Tight alpha bounds retain transparent zigzag cutouts, but remove empty outer rows/columns. */
export function receiptImageBounds(data: ArrayLike<number>, width: number, height: number) {
    let left = width, top = height, right = -1, bottom = -1
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!data[(y * width + x) * 4 + 3]) continue
            left = Math.min(left, x); right = Math.max(right, x)
            top = Math.min(top, y); bottom = Math.max(bottom, y)
        }
    }
    if (right < left) throw Error('小票图片为空，请重试')
    return {x:left,y:top,width:right-left+1,height:bottom-top+1}
}
