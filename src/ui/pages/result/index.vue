<template>
  <view class="result-page">
    <app-navbar :show-back="viewMode === 'room-ended' ? true : undefined" fallback subtitle="今日用餐记录"
                title="今日战果" @back="goBack" @fallback="goBack"/>

    <view :class="{'saved-receipt': isSavedView}" class="receipt-stage">
      <view v-if="!isSavedView" class="printer-shell">
        <view class="printer-face">
          <view class="printer-lights">
            <view>
              <text class="light power"/>
              <text>POWER</text>
            </view>
            <view>
              <text class="light"/>
              <text>ERROR</text>
            </view>
          </view>
          <view class="printer-screen flex-center">
            <text>BUFFET-CALC</text>
            <text aria-live="polite" class="printing">{{ printComplete ? 'PRINT COMPLETE' : 'PRINTING...' }}</text>
          </view>
          <depth-button :depth="8" :disabled="isPrinting || album.busy.value" ambient-shadow="0 14rpx 18rpx rgba(0, 0, 0, .16)"
                        class="camera-key" label="打开保存小票图片"
                        shadow-color="#aaa299" @click="openReceiptPreview">
            <text class="camera-icon iconfont icon-xiangji"/>
          </depth-button>
        </view>
        <view class="printer-slot"/>
      </view>
      <view :class="{'is-feeding': isPrinting}" :style="{'--receipt-print-duration': RECEIPT_PRINT_MS + 'ms'}"
            class="receipt-output" @animationend="onPrintEnd">
        <receipt-paper :detached="isSavedView" v-bind="receiptProps" @save-image="openReceiptPreview"/>
      </view>
    </view>

    <canvas v-if="album.canvasVersion.value" :key="album.canvasVersion.value" canvas-id="receipt-album" id="receipt-album" class="receipt-canvas" :hidpi="false" :style="{width: album.canvasSize.value.width + 'px', height: album.canvasSize.value.height + 'px'}" :width="album.canvasSize.value.width" :height="album.canvasSize.value.height"/>
    <app-dialog v-if="album.previewPath.value" title="保存小票图片" @close="album.previewPath.value = ''">
      <text class="album-preview-note">长按图片保存，也可以点击图片下载</text>
      <!-- #ifdef H5 -->
      <a :href="album.previewPath.value" :download="album.filename.value" class="album-download">
        <img class="album-preview" :src="album.previewPath.value" alt="小票图片，长按可保存"/>
      </a>
      <!-- #endif -->
      <!-- #ifndef H5 -->
      <image class="album-preview" :src="album.previewPath.value" mode="widthFix" :show-menu-by-longpress="true" @tap="album.download"/>
      <!-- #endif -->
    </app-dialog>
    <app-confirm-dialog :controller="album.permissionDialog"/>

    <text v-if="isRoomView && roomMessage" class="room-result-note">{{ roomMessage }}</text>
    <view class="result-actions">
      <view class="secondary-action flex-center" @tap="secondaryAction.run">{{ secondaryAction.label }}</view>
      <view v-if="!isSavedView" class="primary-action flex-center" @tap="save">存到小票夹</view>
    </view>
    <app-confirm-dialog :controller="confirmation"/>
  </view>
</template>

<script lang="ts" setup>
import {usePersonalStore} from '@/stores/business/usePersonalStore'
import {useDiningStore} from '@/stores/business/useDiningStore'
import {useMenuPageStateStore} from '@/stores/page-state/useMenuPageStateStore'
import {ReceiptView} from '@/ui/presentation/ReceiptView'
import {PageSelection} from '@/ui/presentation/PageSelection'
import DepthButton from '@/ui/components/depth-button/depth-button.vue'
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import AppDialog from '@/ui/components/app-dialog/app-dialog.vue'
import {computed, ref, watch} from 'vue'
import {useReceiptAlbum} from '@/ui/composables/useReceiptAlbum'
import {onLoad, onShow, onUnload} from '@dcloudio/uni-app'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {useAppDialog} from '@/ui/components/app-confirm-dialog/useAppDialog'
import {time} from '@/ui/format/time'
import {PageFeedback} from '@/ui/presentation/PageFeedback'

const menuPageState = useMenuPageStateStore()


const personal = usePersonalStore()
const dining = useDiningStore()
const selectedRestaurant = computed(() => PageSelection.restaurant(dining.restaurantsData, menuPageState.selectedRestaurants[dining.sessionData?.activityId || '']))
const finalRestaurantId = computed(() => selectedRestaurant.value)

// 展示数据
const savedView = ref(false)
const displayReceipt = computed(() => {
  const selected = finalRestaurantId.value || selectedRestaurant.value
  const result = savedView.value ? personal.receiptData : dining.activityData?.result ||
      (dining.sessionData && selected ? dining.preview(selected) : undefined)
  return result ? ReceiptView.fromResult(result) : {
    id: '',
    restaurant: '尚无用餐结果',
    typeName: '',
    date: '',
    price: 0,
    value: 0,
    participants: [],
    lines: [],
    rounds: [],
    result: {difference: 0, percent: 0, isBreakEven: false, verdict: 'below' as const}
  }
})
const roomMessage = ref('')

const receiptProps = computed(() => {
  const {id, date, ...receipt} = displayReceipt.value
  return {
    ...receipt,
    receiptId: id.split('-').pop()?.toUpperCase() || 'DINING',
    dateTime: time.formatReceiptTimestamp(date)
  }
})

// UI 交互状态
const confirmation = useAppDialog()

type ResultMode = 'single' | 'single-ended' | 'room-host' | 'room-member' | 'room-ended' | 'saved'

const viewMode = computed<ResultMode>(() => {
  const room = dining.roomData;
  return savedView.value ? 'saved' : !room ? dining.activityData?.status === 'ENDED' ? 'single-ended' : 'single' : room.status !== 'ACTIVE' ? 'room-ended' : room.hostId === dining.identityData?.id ? 'room-host' : 'room-member'
})

const isSavedView = computed(() => viewMode.value === 'saved')

const isRoomView = computed(() => viewMode.value.startsWith('room-'))

const printComplete = ref(false), RECEIPT_PRINT_MS = 1500

const isPrinting = computed(() => !isSavedView.value && !printComplete.value)

const album = useReceiptAlbum(() => ({...receiptProps.value, date: displayReceipt.value.date}))

// 路由方法
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)

const goBack = () => viewMode.value === 'room-ended' || viewMode.value === 'single-ended' ? finishShared() : navigation.back(isSavedView.value ? 'receipts' : 'menu')

const finishShared = () => navigation.open('setup', 'reset')

// UI 交互方法
const secondaryAction = computed(() => {
  switch (viewMode.value) {
    case 'saved':
      return {label: '删除收藏', run: confirmDelete}
    case 'room-ended':
    case 'single-ended':
      return {label: '返回首页', run: finishShared}
    case 'room-host':
      return {label: '结束整桌用餐', run: endRoom}
    case 'room-member':
      return {label: '继续用餐', run: goBack}
    default:
      return {label: '结束用餐', run: endDining}
  }
})

function onPrintEnd(event: { animationName?: string; detail?: { animationName?: string } }) {
  const name = event.animationName || event.detail?.animationName
  if (!name || name.startsWith('receipt-feed')) printComplete.value = true
}

function openReceiptPreview() {
  if (!isPrinting.value) return album.openPreview()
}

function endDining() {
  if (!finalRestaurantId.value) throw new Error('当前餐厅不可用，请返回菜单重试')
  confirmation.open({
    title: '结算当前餐厅',
    content: `选择「${displayReceipt.value.restaurant}」作为唯一最终餐厅并结束用餐？`,
    success: r => {
      if (r.confirm) return completeDining()
    }
  })
}

function endRoom() {
  if (!finalRestaurantId.value) throw new Error('当前餐厅不可用，请返回菜单重试')
  confirmation.open({
    title: '结算当前餐厅',
    content: `全桌选择「${displayReceipt.value.restaurant}」作为唯一最终餐厅并结束用餐？`,
    success: r => {
      if (r.confirm) return completeRoom()
    }
  })
}

function confirmDelete() {
  confirmation.open({
    title: '删除收藏', content: '确定删除这张小票吗？', success: r => {
      if (r.confirm) return deleteReceipt()
    }
  })
}

// 业务操作
async function save() {
  await personal.saveReceipt(dining.activityData?.result || dining.preview(finalRestaurantId.value || selectedRestaurant.value))
  uni.showToast({title: '已存到小票夹', icon: 'none'})
}

async function completeDining() {
  await dining.finish(finalRestaurantId.value)
  await finishShared()
}

async function completeRoom() {
  await completeDining()
}

async function deleteReceipt() {
  await personal.deleteReceipt()
  await navigation.back('receipts')
}

// 生命周期与动画监听
let historyPending: Promise<unknown> | undefined
async function ensureHistory() {
  const session = dining.sessionData, activity = dining.activityData, room = dining.roomData
  if (savedView.value || !session || activity?.status !== 'ENDED' || !activity.result ||
      !room?.eligibleIds.includes(dining.identityData?.id || '') ||
      personal.historyData.some(record => record.activityId === activity.id)) return
  if (historyPending) return historyPending
  historyPending = personal.saveHistory(session, activity.result)
  try { await historyPending } finally { historyPending = undefined }
}

const resultLoaded = ref(false)
watch(() => resultLoaded.value && !savedView.value && dining.activityData?.status === 'ENDED' &&
    dining.roomData?.eligibleIds.includes(dining.identityData?.id || '') ? dining.activityData.id : '', id => {
  if (id) void ensureHistory().catch(PageFeedback.report)
})

onLoad(async query => {
  if (query?.receiptId) {
    savedView.value = true
  }
  await ensureHistory()
  resultLoaded.value = true
})
onShow(() => {
  if (resultLoaded.value) void ensureHistory().catch(PageFeedback.report)
})

const stopPrintTimer = watch(isPrinting, (printing, _previous, onCleanup) => {
  if (!printing) return
  const timer = setTimeout(() => {
    printComplete.value = true
  }, RECEIPT_PRINT_MS)
  onCleanup(() => clearTimeout(timer))
}, {immediate: true})

onUnload(stopPrintTimer)
</script>

<style scoped>
.receipt-canvas {position:fixed;left:-10000px;top:0;pointer-events:none}
.album-preview {display:block;width:100%}
.album-download {display:block}

.album-preview-note {
  display: block;
  margin-bottom: 24rpx;
  color: #946e4c;
  font-size: 26rpx;
  line-height: 1.7
}

.room-result-note {
  display: block;
  margin: 24rpx 32rpx;
  color: #a66c38;
  font-size: 26rpx;
  text-align: center
}

.result-page {
  min-height: 100vh;
  background: #ffead3;
  padding-bottom: 150rpx;
  box-sizing: border-box;
}

.receipt-stage {
  margin: 6rpx 22rpx 0;
}

.receipt-output {
  overflow: hidden;
  padding-bottom: 18rpx;
}

.is-feeding :deep(.receipt) {
  animation: receipt-feed var(--receipt-print-duration, 1500ms) cubic-bezier(.2, .55, .45, 1) both;
}

.saved-receipt {
  margin-top: 40rpx
}

.saved-receipt .receipt-output {
  overflow: visible
}

@keyframes receipt-feed {
  from {
    transform: translateY(calc(-100% - 30rpx))
  }
  to {
    transform: translateY(0)
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-feeding :deep(.receipt) {
    animation-duration: 1ms
  }
}

.printer-shell {
  height: 196rpx;
  padding: 22rpx 22rpx 0;
  border: 3rpx solid rgba(255, 255, 255, .75);
  border-radius: 38rpx;
  background: linear-gradient(180deg, #f4efe6, #eee7dc);
  box-shadow: inset 0 4rpx 12rpx rgba(96, 78, 55, .12), 0 8rpx 20rpx rgba(104, 74, 40, .08);
  position: relative;
  box-sizing: border-box;
}

.printer-face {
  height: 144rpx;
  padding: 22rpx 24rpx;
  border-radius: 28rpx;
  background: #e4ddcf;
  box-shadow: inset 0 3rpx 10rpx rgba(91, 74, 51, .1);
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-sizing: border-box;
}

.printer-lights {
  width: 108rpx;
  display: flex;
  flex: 0 0 108rpx;
  flex-direction: column;
  gap: 22rpx;
  color: #9f9385;
  font-size: 17rpx;
  font-weight: 800;
}

.printer-lights > view {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.light {
  width: 13rpx;
  height: 13rpx;
  border-radius: 50%;
  background: #b9bdbe;
  box-shadow: inset 0 1rpx 3rpx rgba(0, 0, 0, .2);
}

.light.power {
  background: #48ba5d;
  box-shadow: 0 0 10rpx rgba(72, 186, 93, .7);
}

.printer-screen {
  flex: 1;
  min-width: 0;
  height: 96rpx;
  border: 7rpx solid #303030;
  border-radius: 8rpx;
  background: linear-gradient(#191919, #222);
  box-shadow: inset 0 3rpx 12rpx #000;
  flex-direction: column;
  color: #ff6939;
  font-size: 27rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
  box-sizing: border-box;
}

.printing {
  font-size: 15rpx;
  font-weight: 400;
  margin-top: 10rpx;
}

.camera-key {
  width: 92rpx;
  height: 92rpx;
  border: 2rpx solid #ff9c72;
  border-radius: 16rpx;
  background: #ff7340;
  flex: 0 0 92rpx;
  box-sizing: border-box;
}

.camera-icon {
  color: white;
  font-size: 40rpx;
}

.printer-slot {
  height: 25rpx;
  border: 3rpx solid #373737;
  border-radius: 15rpx;
  background: linear-gradient(#111, #242424);
  box-shadow: 0 5rpx 8rpx rgba(0, 0, 0, .3);
  position: absolute;
  left: 52rpx;
  right: 52rpx;
  bottom: -12rpx;
  z-index: 2;
  box-sizing: border-box;
}

.result-actions {
  position: fixed;
  left: 32rpx;
  right: 32rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  z-index: 60;
  display: flex;
  gap: 20rpx;
}

.result-actions > view {
  flex: 1;
  height: 88rpx;
  border-radius: 40rpx;
  font-size: 29rpx;
  font-weight: 900;
}

.secondary-action {
  background: white;
  border: 2rpx solid #ffdfbd;
  color: #ff6331;
}

.primary-action {
  background: #ff6331;
  color: white;
}
</style>
