<template>
  <view class="result-page">
    <result-navbar :fallback="navigationFallback" />

    <view class="printer">
      <view class="printer-shell">
        <view class="printer-face">
          <view class="printer-lights">
            <view><text class="light power" /><text>POWER</text></view>
            <view><text class="light" /><text>ERROR</text></view>
          </view>
          <view class="printer-screen flex-center"><text>BUFFET-CALC</text><text class="printing">PRINTING...</text></view>
          <view class="camera-key flex-center"><text class="camera-icon iconfont icon-xiangji" /></view>
        </view>
        <view class="printer-slot" />
      </view>
      <receipt-paper
        :receipt-id="shortId"
        :date-time="displayReceipt.date"
        :price="displayReceipt.price"
        :value="displayReceipt.value"
        :lines="displayReceipt.lines"
      />
    </view>

    <view v-if="!isSavedView" class="result-actions">
      <view class="secondary-action flex-center" @tap="endDining">结束用餐</view>
      <view class="primary-action flex-center" @tap="save">存到小票夹</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useBuffetStore } from '@/store/buffet'
import { currentTime, shortDate } from '@/utils/format'
import type { ReceiptItem } from '@/types/buffet'
import { buildReceipt } from '@/domain/buffet'
import ResultNavbar from './components/result-navbar.vue'

const { session, receipts, selectedLines, completeDining } = useBuffetStore()
const receiptId = ref('')
const finishing = ref(false)
const liveDate = ref(`${shortDate()} ${currentTime()}`)
const savedReceipt = computed(() => receipts.value.find((item) => item.id === receiptId.value))
const isSavedView = computed(() => Boolean(receiptId.value))
const navigationFallback = computed(() => isSavedView.value ? '/pages/receipts/index' : '/pages/menu/index')
const displayReceipt = computed<ReceiptItem>(() => savedReceipt.value || buildReceipt(session, liveDate.value, selectedLines.value))
const shortId = computed(() => displayReceipt.value.id.split('-').pop()?.toUpperCase() || 'DINING')

onLoad((query) => {
  receiptId.value = decodeURIComponent(query?.receiptId || '')
  if (receiptId.value) {
    if (!savedReceipt.value) uni.redirectTo({ url: '/pages/receipts/index' })
    return
  }
  if (!session.active || (!session.rounds.length && !selectedLines.value.length)) {
    uni.redirectTo({ url: '/pages/menu/index' })
  }
})

function endDining() {
  if (finishing.value) return
  finishing.value = true
  if (!completeDining(false)) {
    finishing.value = false
    return
  }
  uni.showToast({ title: '已保存到点餐明细', icon: 'none' })
  setTimeout(() => uni.reLaunch({ url: '/pages/setup/index' }), 350)
}

function save() {
  if (finishing.value) return
  finishing.value = true
  if (!completeDining(true)) {
    finishing.value = false
    return
  }
  uni.showToast({ title: '已保存到小票夹和点餐明细', icon: 'none' })
  setTimeout(() => uni.reLaunch({ url: '/pages/mine/index' }), 350)
}
</script>

<style scoped>
.result-page { min-height: 100vh; background: #ffead3; padding-bottom: 150rpx; box-sizing: border-box; }
.printer { margin: 6rpx 22rpx 0; }
.printer-shell { height: 196rpx; padding: 22rpx 22rpx 0; border: 3rpx solid rgba(255,255,255,.75); border-radius: 38rpx; background: linear-gradient(180deg,#f4efe6,#eee7dc); box-shadow: inset 0 4rpx 12rpx rgba(96,78,55,.12), 0 8rpx 20rpx rgba(104,74,40,.08); position: relative; box-sizing: border-box; }
.printer-face { height: 144rpx; padding: 22rpx 24rpx; border-radius: 28rpx; background: #e4ddcf; box-shadow: inset 0 3rpx 10rpx rgba(91,74,51,.1); display: flex; align-items: center; gap: 20rpx; box-sizing: border-box; }
.printer-lights { width: 108rpx; display: flex; flex: 0 0 108rpx; flex-direction: column; gap: 22rpx; color: #9f9385; font-size: 17rpx; font-weight: 800; }
.printer-lights > view { display: flex; align-items: center; gap: 10rpx; }
.light { width: 13rpx; height: 13rpx; border-radius: 50%; background: #b9bdbe; box-shadow: inset 0 1rpx 3rpx rgba(0,0,0,.2); }
.light.power { background: #48ba5d; box-shadow: 0 0 10rpx rgba(72,186,93,.7); }
.printer-screen { flex: 1; min-width: 0; height: 96rpx; border: 7rpx solid #303030; border-radius: 8rpx; background: linear-gradient(#191919,#222); box-shadow: inset 0 3rpx 12rpx #000; flex-direction: column; color: #ff6939; font-size: 27rpx; font-weight: 900; letter-spacing: 2rpx; box-sizing: border-box; }
.printing { font-size: 15rpx; font-weight: 400; margin-top: 10rpx; }
.camera-key { width: 92rpx; height: 92rpx; border: 2rpx solid #ff9c72; border-radius: 16rpx; background: #ff7340; box-shadow: 0 8rpx 0 #aaa299, 0 14rpx 18rpx rgba(0,0,0,.16); flex: 0 0 92rpx; box-sizing: border-box; }
.camera-icon { color: white; font-size: 40rpx; }
.printer-slot { height: 25rpx; border: 3rpx solid #373737; border-radius: 15rpx; background: linear-gradient(#111,#242424); box-shadow: 0 5rpx 8rpx rgba(0,0,0,.3); position: absolute; left: 52rpx; right: 52rpx; bottom: -12rpx; z-index: 2; box-sizing: border-box; }
.result-actions { position: fixed; left: 32rpx; right: 32rpx; bottom: calc(24rpx + env(safe-area-inset-bottom)); z-index: 60; display: flex; gap: 20rpx; }
.result-actions > view { flex: 1; height: 88rpx; border-radius: 40rpx; font-size: 29rpx; font-weight: 900; }
.secondary-action { background: white; border: 2rpx solid #ffdfbd; color: #ff6331; }
.primary-action { background: #ff6331; color: white; }
</style>
