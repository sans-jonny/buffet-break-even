<template>
  <view class="result-page">
    <initialization-gate>
    <app-navbar fallback title="今日战果" subtitle="今日用餐记录" :show-back="isRoomView && roomEnded ? true : undefined" @back="goBack" @fallback="goBack"/>

    <view class="receipt-stage" :class="{'saved-receipt': isSavedView}">
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
            <text class="printing" aria-live="polite">{{ printComplete ? 'PRINT COMPLETE' : 'PRINTING...' }}</text>
          </view>
          <depth-button class="camera-key" :depth="8" shadow-color="#aaa299" ambient-shadow="0 14rpx 18rpx rgba(0, 0, 0, .16)" label="打开保存小票图片" :disabled="album.busy.value || isPrinting" @click="openReceiptPreview">
            <text class="camera-icon iconfont icon-xiangji"/>
          </depth-button>
        </view>
        <view class="printer-slot"/>
      </view>
      <view v-if="savedReceipt || diningStore.view.canFinish" class="receipt-output" :class="{'is-feeding': isPrinting}" :style="{'--receipt-print-duration': RECEIPT_PRINT_MS + 'ms'}" @animationend="onPrintEnd">
        <receipt-paper
          :detached="isSavedView"
          :restaurant="displayReceipt.restaurant"
          :type-name="displayReceipt.typeName"
          :participants="displayReceipt.participants"
          :receipt-id="shortId"
          :date-time="formatReceiptTimestamp(displayReceipt.date)"
          :price="displayReceipt.price"
          :value="displayReceipt.value"
          :lines="displayReceipt.lines"
          :result="displayReceipt.result"
          @save-image="openReceiptPreview"
      />
      </view>
    </view>

    <canvas v-if="album.canvasVersion.value" :key="album.canvasVersion.value" canvas-id="receipt-album" id="receipt-album" class="receipt-canvas" :hidpi="false" :style="{width: album.canvasSize.value.width + 'px', height: album.canvasSize.value.height + 'px'}" :width="album.canvasSize.value.width" :height="album.canvasSize.value.height"/>
    <app-dialog v-if="album.previewPath.value" title="保存小票图片" @close="album.previewPath.value = ''">
      <text class="album-preview-note">{{ album.busy.value ? '正在保存图片…' : '点击图片下载' }}</text>
      <!-- #ifdef H5 -->
      <a :href="album.previewPath.value" :download="album.filename.value" class="album-download">
        <image class="album-preview" :src="album.previewPath.value" mode="widthFix" :show-menu-by-longpress="false"/>
      </a>
      <!-- #endif -->
      <!-- #ifndef H5 -->
      <image class="album-preview" :src="album.previewPath.value" mode="widthFix" :show-menu-by-longpress="false" @tap="album.download"/>
      <!-- #endif -->
    </app-dialog>
    <app-confirm-dialog :controller="album.permissionDialog"/>

    <view v-if="isSavedView" class="result-actions">
      <view class="secondary-action flex-center" @tap="confirmDelete">删除收藏</view>
    </view>
    <text v-if="isRoomView && roomStore.view.message" class="room-result-note">{{ roomStore.view.message }}</text>
    <view v-if="isRoomView" class="result-actions">
      <template v-if="roomEnded">
        <view class="secondary-action flex-center" @tap="finishShared">返回首页</view>
        <view class="primary-action flex-center" :class="{'receipt-saving': savingReceipt}" @tap="save">{{ savingReceipt ? '保存中…' : '存到小票夹' }}</view>
      </template>
      <template v-else>
        <view class="secondary-action flex-center" @tap="isHost ? endRoom() : goBack()">{{ isHost ? '结束整桌用餐' : '继续用餐' }}</view>
        <view class="primary-action flex-center" :class="{'receipt-saving': savingReceipt}" @tap="save">{{ savingReceipt ? '保存中…' : '存到小票夹' }}</view>
      </template>
    </view>
    <view v-if="!isSavedView && !isRoomView" class="result-actions">
      <view class="secondary-action flex-center" @tap="endDining">结束用餐</view>
      <view class="primary-action flex-center" :class="{'receipt-saving': savingReceipt}" @tap="save">{{ savingReceipt ? '保存中…' : '存到小票夹' }}</view>
    </view>
    <app-confirm-dialog :controller="confirmation"/>
  </initialization-gate>
  </view>
</template>

<script setup lang="ts">
import DepthButton from '@/ui/components/depth-button/depth-button.vue'
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import {useAppDialog} from '@/ui/composables/useAppDialog'
const confirmation = useAppDialog()
import {useApplicationStore} from '@/ui/stores/useApplicationStore'
import InitializationGate from '@/ui/components/initialization-gate/initialization-gate.vue'
import {computed, ref, watch} from 'vue'
import {onLoad, onUnload, onBackPress} from '@dcloudio/uni-app'
import {CompleteDiningInput} from '@/contexts/dining/public'
import {DeleteReceiptInput} from '@/contexts/dining/public'
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import {useRequired} from '@/ui/composables/useRequired'
import {runAction} from '@/ui/composables/runAction'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {formatReceiptTimestamp} from '@/ui/format/time'
import {RoomInput, SaveRoomResultInput, SaveDiningReceiptInput} from '@/contexts/dining/public'
import {useRoomStore} from '@/ui/stores/useRoomStore'
import {useActiveDining, useRoomConnection} from '@/ui/composables/useActiveDining'
import {useReceiptAlbum} from '@/ui/composables/useReceiptAlbum'
import AppDialog from '@/ui/components/app-dialog/app-dialog.vue'

const applicationStore = useApplicationStore()
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)
import {useCollectionStore} from '@/ui/stores/useCollectionStore'

const diningStore = useActiveDining()
const roomStore = useRoomStore(), restoreRoom = useRoomConnection()
const roomInput = useRequired<RoomInput>(RoomInput.Token)
const saveRoom = useRequired<SaveRoomResultInput>(SaveRoomResultInput.Token)
const collectionStore = useCollectionStore()
const complete = useRequired<CompleteDiningInput>(CompleteDiningInput.Token)
const saveReceipt = useRequired<SaveDiningReceiptInput>(SaveDiningReceiptInput.Token)
const removeReceipt = useRequired<DeleteReceiptInput>(DeleteReceiptInput.Token)
const receiptId = ref('')
const finishing = ref(false)
const savingReceipt = ref(false)
const isSavedView = computed(() => Boolean(receiptId.value))
const printComplete = ref(false)
const RECEIPT_PRINT_MS = 1500
const isPrinting = computed(() => applicationStore.ready && !isSavedView.value && diningStore.view.canFinish && !printComplete.value)
// 小程序的组件内动画事件不一定冒泡到页面，不能只依赖 animationend 解锁保存。
const stopPrintTimer = watch(isPrinting, (printing, _previous, onCleanup) => {
  if (!printing) return
  const timer = setTimeout(() => {printComplete.value = true}, RECEIPT_PRINT_MS)
  onCleanup(() => clearTimeout(timer))
}, {immediate: true})
onUnload(stopPrintTimer)
function onPrintEnd(event: {animationName?: string; detail?: {animationName?: string}}) {
  const name = event.animationName || event.detail?.animationName
  if (!name || name.startsWith('receipt-feed')) printComplete.value = true
}
const isRoomView = computed(() => !isSavedView.value && Boolean(roomStore.view.snapshot))
const roomEnded = computed(() => roomStore.view.snapshot?.status === 'ended')
const isHost = computed(() => roomStore.view.snapshot?.hostId === roomStore.view.memberId)
const savedReceipt = computed(() => collectionStore.receiptById(receiptId.value))
const displayReceipt = computed(() => savedReceipt.value || diningStore.view.previewReceipt)
const shortId = computed(() => displayReceipt.value.id.split('-').pop()?.toUpperCase() || 'DINING')
const album = useReceiptAlbum(() => ({...displayReceipt.value, receiptId:shortId.value, dateTime:formatReceiptTimestamp(displayReceipt.value.date)}))
function openReceiptPreview() {
  if (!applicationStore.ready || isPrinting.value || (!savedReceipt.value && !diningStore.view.canFinish)) return
  return album.openPreview()
}
const goBack = () => isRoomView.value && roomEnded.value ? finishShared()
    : runAction(() => navigation.back(isSavedView.value ? 'receipts' : 'menu'))
onBackPress(() => {
  if (!isRoomView.value || !roomEnded.value) return false
  finishShared()
  return true
})
function checkReceipt() {
  if (!applicationStore.ready) return
  return runAction(async () => {
    if (!receiptId.value) {try {await restoreRoom()} catch (error) {if (!roomStore.view.snapshot) throw error}}
    if (receiptId.value && !savedReceipt.value) await navigation.open('receipts', 'replace')
    else if (!receiptId.value && !diningStore.view.canFinish) await navigation.open('menu', 'replace')
  })
}
onLoad(query => void runAction(() => {
  receiptId.value = query?.receiptId ? decodeURIComponent(query.receiptId) : ''
  return checkReceipt()
}))
watch(() => applicationStore.ready, initialized => { if (initialized) void checkReceipt() })

function finish(collectReceipt: boolean) {
  if (finishing.value) return
  void runAction(async () => {
    finishing.value = true
    try {
      const response = complete.execute({collectReceipt})
      if (response.completed) uni.showToast({
        title: collectReceipt ? '已保存到小票夹和点餐明细' : '已保存到点餐明细',
        icon: 'none'
      })
      await navigation.open(collectReceipt ? 'mine' : 'setup', 'reset')
    } finally {
      finishing.value = false
    }
  })
}

function confirmSingle(collect: boolean) {
  const restaurant = displayReceipt.value.restaurant
  confirmation.open({title: '结算当前餐厅', content: '将结算「' + restaurant + '」，其他餐厅草稿将被丢弃。', success: result => {if (result.confirm) finish(collect)}})
}
const endDining = () => confirmSingle(false)
const save = () => runAction(() => {
  if (savingReceipt.value || finishing.value || isSavedView.value || !applicationStore.ready || !diningStore.view.canFinish) return
  savingReceipt.value = true
  try {
    const existed = Boolean(collectionStore.receiptById(displayReceipt.value.id))
    const response = saveReceipt.execute(new SaveDiningReceiptInput.Request(isRoomView.value ? JSON.parse(JSON.stringify(displayReceipt.value)) : undefined))
    if (!response.saved) throw Error('请先点菜后再保存小票')
    uni.showToast({title:existed ? '小票已更新' : '已保存到小票夹',icon:'none'})
  } finally {savingReceipt.value = false}
})

function endRoom() {
  if (finishing.value || roomStore.view.status !== 'online') return
  const expectedRevision = roomStore.view.snapshot?.revision
  const restaurantId = diningStore.view.session.restaurantId
  const restaurantName = displayReceipt.value.restaurant
  confirmation.open({title: '结束整桌用餐', content: '仅结算「' + restaurantName + '」，待选菜品会计入结果，其他餐厅草稿将被丢弃。结束后每人独立选择是否收藏。', success: result => {
    if (result.confirm) void runAction(async () => {
      finishing.value = true
      try {await roomInput.execute({command: 'end', params: {expectedRevision, restaurantId}})} finally {finishing.value = false}
    })
  }})
}
function finishShared() {
  if (finishing.value || !roomStore.view.snapshot?.receipt) return
  void runAction(async () => {
    finishing.value = true
    try {
      saveRoom.execute({receipt: JSON.parse(JSON.stringify(roomStore.view.snapshot!.receipt)), collectReceipt:false})
      await roomInput.execute({command: 'suspend', params: {}})
      await navigation.open('setup', 'reset')
    } finally {finishing.value = false}
  })
}

function confirmDelete() {
  confirmation.open({
    title: '删除收藏', content: '仅删除收藏的小票，点餐记录仍然保留。', success: result => {
      if (result.confirm) void runAction(async () => {
        removeReceipt.execute({receiptId: receiptId.value});
        await navigation.open('receipts', 'replace')
      })
    }
  })
}
</script>

<style scoped>
.receipt-saving {filter:grayscale(50%)}
.receipt-canvas {position:fixed;left:-10000px;top:0;pointer-events:none}
.album-preview-note {display:block;margin-bottom:24rpx;color:#946e4c;font-size:26rpx;line-height:1.7}
.album-preview {display:block;width:100%}
.album-download {display:block}
.room-result-note {display:block;margin:24rpx 32rpx;color:#a66c38;font-size:26rpx;text-align:center}
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

.saved-receipt {margin-top: 40rpx}
.saved-receipt .receipt-output {overflow: visible}

@keyframes receipt-feed {
  from {transform: translateY(calc(-100% - 30rpx))}
  to {transform: translateY(0)}
}

@media (prefers-reduced-motion: reduce) {
  .is-feeding :deep(.receipt) {animation-duration: 1ms}
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
