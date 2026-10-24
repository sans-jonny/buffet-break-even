import {getCurrentInstance, nextTick, ref} from 'vue'
import {drawReceiptImage, layoutReceiptImage, type ReceiptImageData} from '@/ui/receipt/ReceiptImage'
import {useAppDialog} from './useAppDialog'
import {runAction} from './runAction'
import {renderReceiptWeb} from '@/ui/receipt/renderReceiptWeb'
import {receiptImageBounds} from '@/ui/receipt/receiptImageBounds'
import {receiptImageFilename} from '@/ui/receipt/receiptImageFilename'

export function useReceiptAlbum(readReceipt: () => ReceiptImageData, renderWeb = renderReceiptWeb) {
    const owner = getCurrentInstance()?.proxy
    const busy = ref(false), previewPath = ref('')
    const filename = ref('')
    const canvasSize = ref({width:600,height:800})
    const canvasVersion = ref(0)
    const permissionDialog = useAppDialog()
    async function saveImage(filePath: string, name: string) {
        const root = (uni as unknown as {env?: {USER_DATA_PATH?: string}}).env?.USER_DATA_PATH
        const fs = root && typeof uni.getFileSystemManager === 'function' ? uni.getFileSystemManager() : null
        let namedPath = fs ? `${root}/${name}` : filePath
        if (fs) {
            const copy = () => new Promise<void>((resolve,reject)=>fs.copyFile({srcPath:filePath,destPath:namedPath,success:()=>resolve(),fail:reject}))
            try {await copy()} catch (error) {
                // Windows 开发者工具的文件系统不允许文件名包含冒号。
                if (!name.includes(':')) throw error
                namedPath = `${root}/${name.replace(/:/g, '-')}`
                await copy()
            }
        }
        try {
            await new Promise<void>((resolve,reject)=>uni.saveImageToPhotosAlbum({filePath:namedPath,success:()=>resolve(),fail:reject}))
            uni.showToast({title:'已保存到相册',icon:'success'})
        } finally {
            if (fs) fs.unlink({filePath:namedPath,fail:()=>{}})
        }
    }
    function requestPermission(filePath: string, name: string) {
        permissionDialog.open({title:'允许保存到相册',content:'请在设置中允许保存图片到相册，然后重试。',confirmText:'去设置',success:result=>{
            if (result.confirm) void runAction(async()=>{
                const settings = await new Promise<UniApp.GetSettingSuccessResult>((resolve,reject)=>uni.openSetting({success:resolve,fail:reject}))
                if (settings.authSetting['scope.writePhotosAlbum']) {
                    try {await saveImage(filePath, name)} catch {throw Error('保存失败，请重试')}
                } else uni.showToast({title:'尚未允许保存到相册',icon:'none'})
            })
        }})
    }
    async function openPreview() {
        if (busy.value) return
        busy.value = true
        try {
            const receipt = readReceipt()
            const name = receiptImageFilename(receipt.restaurant, receipt.date || receipt.dateTime, receipt.typeName)
            filename.value = name
            const layout = layoutReceiptImage(receipt)
            const appInfo = typeof uni.getAppBaseInfo === 'function' ? uni.getAppBaseInfo() : uni.getSystemInfoSync()
            const platform = (appInfo as {uniPlatform?: string}).uniPlatform
            if (platform === 'web' || platform === 'h5') {
                previewPath.value = renderWeb(layout)
                return
            }
            canvasSize.value = {width:layout.pixelWidth,height:layout.pixelHeight}
            // Mount a fresh canvas with its final dimensions. Updating an existing H5
            // canvas triggers an asynchronous ResizeSensor that can otherwise crop
            // the first drawing before the bitmap has caught up with its CSS size.
            canvasVersion.value++
            await nextTick()
            const context = uni.createCanvasContext('receipt-album',owner)
            drawReceiptImage(context,layout)
            await new Promise<void>(resolve=>context.draw(false,()=>resolve()))
            const pixels = await new Promise<UniApp.CanvasGetImageDataRes>((resolve,reject)=>uni.canvasGetImageData({
                canvasId:'receipt-album',x:0,y:0,width:layout.pixelWidth,height:layout.pixelHeight,
                success:resolve,fail:reject
            },owner))
            const bounds = receiptImageBounds(pixels.data,pixels.width,pixels.height)
            const path = await new Promise<string>((resolve,reject)=>uni.canvasToTempFilePath({
                canvasId:'receipt-album',...bounds,
                destWidth:bounds.width,destHeight:bounds.height,fileType:'png',
                success:result=>resolve(result.tempFilePath),fail:reject
            },owner))
            previewPath.value = path
        } catch (error) {
            uni.showToast({title:error instanceof Error ? error.message : '生成小票图片失败，请重试',icon:'none'})
        } finally {busy.value = false}
    }
    async function download() {
        if (busy.value || !previewPath.value) return
        const path = previewPath.value, name = filename.value
        busy.value = true
        try {await saveImage(path, name)} catch (error) {
            const message = (error as {errMsg?: string})?.errMsg || ''
            if (/auth|permission|authorize|scope/i.test(message)) requestPermission(path, name)
            else if (/cancel/i.test(message)) uni.showToast({title:'已取消保存',icon:'none'})
            else uni.showToast({title:'保存失败，请重试',icon:'none'})
        } finally {busy.value = false}
    }
    return {busy,canvasSize,canvasVersion,previewPath,filename,permissionDialog,openPreview,download}
}
