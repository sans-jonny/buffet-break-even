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
          <depth-button :depth="8" :disabled="isPrinting" ambient-shadow="0 14rpx 18rpx rgba(0, 0, 0, .16)"
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

    <app-dialog v-if="showReceiptPreview" title="保存小票图片" @close="showReceiptPreview = false">
      <text class="album-preview-note">小票预览</text>
      <receipt-paper detached v-bind="receiptProps"/>
    </app-dialog>

    <text v-if="isRoomView && roomMessage" class="room-result-note">{{ roomMessage }}</text>
    <view class="result-actions">
      <view class="secondary-action flex-center" @tap="secondaryAction.run">{{ secondaryAction.label }}</view>
      <view v-if="!isSavedView" class="primary-action flex-center" @tap="save">存到小票夹</view>
    </view>
    <app-confirm-dialog :controller="confirmation"/>
  </view>
</template>

<script lang="ts" setup>
import DepthButton from '@/ui/components/depth-button/depth-button.vue'
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import AppDialog from '@/ui/components/app-dialog/app-dialog.vue'
import {computed, ref, watch} from 'vue'
import {onLoad, onUnload} from '@dcloudio/uni-app'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {useAppDialog} from '@/ui/components/app-confirm-dialog/useAppDialog'
import {formatReceiptTimestamp} from '@/ui/format/time'

// 展示数据
const displayReceipt = ref({
  "id": "ui-receipt-001",
  "restaurant": "牛牛",
  "typeName": "寿喜烧",
  "date": "2026-11-01T12:30:00+08:00",
  "price": 200,
  "value": 248,
  "participants": [
    "小羊",
    "饭搭子"
  ],
  "lines": [
    {
      "name": "牛上脑",
      "count": 20,
      "price": 10
    },
    {
      "name": "鲜虾",
      "count": 2,
      "price": 18
    },
    {
      "name": "时蔬拼盘",
      "count": 1,
      "price": 12
    }
  ],
  "result": {
    "difference": 48,
    "percent": 124,
    "isBreakEven": true,
    "verdict": "break-even" as 'break-even' | 'close' | 'below'
  }
})

const roomMessage = ref('')

const receiptProps = computed(() => {
  const {id, date, ...receipt} = displayReceipt.value
  return {...receipt, receiptId: id.split('-').pop()?.toUpperCase() || 'DINING', dateTime: formatReceiptTimestamp(date)}
})

// UI 交互状态
const confirmation = useAppDialog()

type ResultMode = 'single' | 'room-host' | 'room-member' | 'room-ended' | 'saved'

const viewMode = ref<ResultMode>('single')

const isSavedView = computed(() => viewMode.value === 'saved')

const isRoomView = computed(() => viewMode.value.startsWith('room-'))

const printComplete = ref(false), RECEIPT_PRINT_MS = 1500

const isPrinting = computed(() => !isSavedView.value && !printComplete.value)

const showReceiptPreview = ref(false)

// 路由方法
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)

const goBack = () => navigation.back(isSavedView.value ? 'receipts' : 'menu')

const finishShared = () => navigation.open('setup', 'reset')

// UI 交互方法
const secondaryAction = computed(() => {
  switch (viewMode.value) {
    case 'saved':
      return {label: '删除收藏', run: confirmDelete}
    case 'room-ended':
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
  if (!isPrinting.value) showReceiptPreview.value = true
}

function endDining() {
  confirmation.open({
    title: '结算当前餐厅', content: '结束当前餐厅的用餐？', success: r => {
      if (r.confirm) return completeDining()
    }
  })
}

function endRoom() {
  confirmation.open({
    title: '结束整桌用餐', content: '结束当前餐厅的用餐？', success: r => {
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

// 业务方法（仅保留事件接口）
function save() {
}

function completeDining() {
}

function completeRoom() {
}

function deleteReceipt() {
}

// 生命周期与动画监听
onLoad(query => {
  if (query?.receiptId) {
    viewMode.value = 'saved'
    displayReceipt.value.id = query.receiptId
  }
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
